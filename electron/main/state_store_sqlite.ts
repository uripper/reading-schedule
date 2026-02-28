/**
 * @file SQLite planner state read/write helpers with tiny mutation journal.
 */
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
    type JsonValue,
    type LoadedPlannerState,
    type PlannerSaveResult,
    type PlannerStateLoadResult,
} from "../types/types.js";
import { sqliteStatePath } from "./state_store_paths";

const STATE_SCHEMA_VERSION = 1;
const JOURNAL_KEEP_ROWS = 200;
const SAVE_OPERATION = "save_snapshot";

/**
 * Opens the SQLite state database and ensures required schema and pragmas.
 * @param databasePath SQLite database file path.
 * @returns Initialized synchronous SQLite handle.
 */
function openDatabase(databasePath: string): DatabaseSync {
    const DATABASE = new DatabaseSync(databasePath);
    DATABASE.exec("PRAGMA journal_mode=WAL;");
    DATABASE.exec("PRAGMA synchronous=FULL;");
    DATABASE.exec("PRAGMA foreign_keys=ON;");
    DATABASE.exec(`
    CREATE TABLE IF NOT EXISTS planner_state_snapshot (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      schema_version INTEGER NOT NULL,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
    DATABASE.exec(`
    CREATE TABLE IF NOT EXISTS planner_state_journal (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );
  `);
    return DATABASE;
}

/**
 * Coerces parsed JSON into object-like state payload.
 * @param value Parsed JSON value.
 * @returns Object payload when valid, otherwise null.
 */
function objectState(value: unknown): LoadedPlannerState | null {
    if (value === null) {
        return null;
    }
    if (Array.isArray(value)) {
        return null;
    }
    if (typeof value !== "object") {
        return null;
    }
    return value as LoadedPlannerState;
}

/**
 * Reads and parses the latest snapshot payload.
 * @param database Open SQLite handle.
 * @returns Parsed snapshot state or null.
 */
function readSnapshotState(database: DatabaseSync): LoadedPlannerState | null {
    const ROW = database
        .prepare("SELECT payload_json FROM planner_state_snapshot WHERE id = 1")
        .get() as { payload_json: string } | undefined;
    if (!ROW) {
        return null;
    }
    try {
        return objectState(JSON.parse(ROW.payload_json) as unknown);
    } catch {
        return null;
    }
}

/**
 * Reads journal rows newest-first and returns first parseable payload.
 * @param database Open SQLite handle.
 * @returns First recoverable state payload from journal, or null.
 */
function recoverStateFromJournal(
    database: DatabaseSync,
): LoadedPlannerState | null {
    const ROWS = database
        .prepare(
            "SELECT payload_json FROM planner_state_journal ORDER BY seq DESC LIMIT ?",
        )
        .all(JOURNAL_KEEP_ROWS) as Array<{ payload_json: string } | undefined>;
    for (const ROW of ROWS) {
        if (!ROW) {
            continue;
        }
        try {
            const PARSED = JSON.parse(ROW.payload_json) as unknown;
            const STATE = objectState(PARSED);
            if (STATE) {
                return STATE;
            }
        } catch {
            // Continue scanning older journal rows.
        }
    }
    return null;
}

/**
 * Upserts the singleton snapshot row with current schema metadata.
 * @param database Open SQLite handle.
 * @param payloadJson Serialized state payload.
 * @param updatedAt ISO timestamp for snapshot update time.
 */
function upsertSnapshot(
    database: DatabaseSync,
    payloadJson: string,
    updatedAt: string,
): void {
    database
        .prepare(
            `
        INSERT INTO planner_state_snapshot (id, schema_version, payload_json, updated_at)
        VALUES (1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          schema_version = excluded.schema_version,
          payload_json = excluded.payload_json,
          updated_at = excluded.updated_at
      `,
        )
        .run(STATE_SCHEMA_VERSION, payloadJson, updatedAt);
}

/**
 * Persists snapshot+journal records transactionally.
 * @param database Open SQLite handle.
 * @param payloadJson Serialized state JSON payload.
 * @returns Save result.
 */
function writeSnapshotTransaction(
    database: DatabaseSync,
    payloadJson: string,
): PlannerSaveResult {
    const CREATED_AT = new Date().toISOString();
    const INSERT_JOURNAL = database.prepare(
        `
      INSERT INTO planner_state_journal (created_at, operation, payload_json)
      VALUES (?, ?, ?)
    `,
    );
    const TRIM_JOURNAL = database.prepare(
        `
      DELETE FROM planner_state_journal
      WHERE seq NOT IN (
        SELECT seq FROM planner_state_journal ORDER BY seq DESC LIMIT ?
      )
    `,
    );
    database.exec("BEGIN IMMEDIATE");
    try {
        INSERT_JOURNAL.run(CREATED_AT, SAVE_OPERATION, payloadJson);
        upsertSnapshot(database, payloadJson, CREATED_AT);
        TRIM_JOURNAL.run(JOURNAL_KEEP_ROWS);
        database.exec("COMMIT");
        return { ok: true };
    } catch (error) {
        database.exec("ROLLBACK");
        if (error instanceof Error) {
            return { error: error.message, ok: false };
        }
        return { error: String(error), ok: false };
    }
}

/**
 * Reads planner state from SQLite snapshot/journal.
 * @param userDataDir App user-data directory.
 * @returns SQLite load result, or null when DB is absent/unreadable.
 */
export function readStateFromSqlite(
    userDataDir: string,
): PlannerStateLoadResult | null {
    const DATABASE_PATH = sqliteStatePath(userDataDir);
    if (!fs.existsSync(DATABASE_PATH)) {
        return null;
    }
    try {
        const DATABASE = openDatabase(DATABASE_PATH);
        try {
            const SNAPSHOT_STATE = readSnapshotState(DATABASE);
            if (SNAPSHOT_STATE) {
                return {
                    source: "sqlite",
                    sourcePath: DATABASE_PATH,
                    state: SNAPSHOT_STATE,
                };
            }
            const RECOVERED_STATE = recoverStateFromJournal(DATABASE);
            if (!RECOVERED_STATE) {
                return null;
            }
            upsertSnapshot(
                DATABASE,
                JSON.stringify(RECOVERED_STATE),
                new Date().toISOString(),
            );
            return {
                source: "sqlite_journal_replay",
                sourcePath: DATABASE_PATH,
                state: RECOVERED_STATE,
                warningCode: "RECOVERED_FROM_JOURNAL",
                warningMessage:
                    "Recovered saved data from journal replay after storage corruption.",
            };
        } finally {
            DATABASE.close();
        }
    } catch {
        return null;
    }
}

/**
 * Writes planner state to SQLite snapshot+journal.
 * @param userDataDir App user-data directory.
 * @param data Serializable planner state payload.
 * @returns Save result.
 */
export function writeStateToSqlite(
    userDataDir: string,
    data: JsonValue,
): PlannerSaveResult {
    try {
        fs.mkdirSync(userDataDir, { recursive: true });
        const DATABASE = openDatabase(sqliteStatePath(userDataDir));
        try {
            return writeSnapshotTransaction(DATABASE, JSON.stringify(data));
        } finally {
            DATABASE.close();
        }
    } catch (error) {
        if (error instanceof Error) {
            return { error: error.message, ok: false };
        }
        return { error: String(error), ok: false };
    }
}
