/**
 * SQLite planner state read/write helpers with tiny mutation journal.
 */
import fs from "node:fs";
// biome-ignore lint/correctness/noUnresolvedImports: node:sqlite is available in the target Electron Node runtime.
import { DatabaseSync } from "node:sqlite";
import type {
    JsonValue,
    LoadedPlannerState,
    PlannerSaveResult,
    PlannerStateLoadResult,
} from "../types/types.ts";
import { objectState, returnErrorMessage } from "./state_store_json.ts";
import { sqliteStatePath } from "./state_store_paths.ts";

const STATE_SCHEMA_VERSION = 1;
const JOURNAL_KEEP_ROWS = 200;
const SAVE_OPERATION = "save_snapshot";

/**
 * Opens the SQLite state database and ensures required schema and pragmas.
 * @param databasePath - SQLite database file path.
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
 * Reads and parses the latest snapshot payload.
 * @param database - Open SQLite handle.
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
 * @param database - Open SQLite handle.
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
        const STATE = recoverJournalRowState(ROW);
        if (STATE !== null) {
            return STATE;
        }
    }
    return null;
}

function recoverJournalRowState(
    row: { payload_json: string } | undefined,
): LoadedPlannerState | null {
    if (row === undefined) {
        return null;
    }
    try {
        return objectState(JSON.parse(row.payload_json) as unknown);
    } catch {
        return null;
    }
}

// TODO: This is so fucking stupid. Why are we just storing a JSON into an 
// SQLite database instead of using the database's native schema capabilities? 

/**
 * Upserts the singleton snapshot row with current schema metadata.
 * @param database - Open SQLite handle.
 * @param payloadJson - Serialized state payload.
 * @param updatedAt - ISO timestamp for snapshot update time.
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

interface JournalStatements {
    insertJournal: ReturnType<DatabaseSync["prepare"]>;
    trimJournal: ReturnType<DatabaseSync["prepare"]>;
}

interface CommitSnapshotWriteArgs {
    createdAt: string;
    database: DatabaseSync;
    payloadJson: string;
    statements: JournalStatements;
}

function journalStatements(database: DatabaseSync): JournalStatements {
    return {
        insertJournal: database.prepare(
            `
      INSERT INTO planner_state_journal (created_at, operation, payload_json)
      VALUES (?, ?, ?)
    `,
        ),
        trimJournal: database.prepare(
            `
      DELETE FROM planner_state_journal
      WHERE seq NOT IN (
        SELECT seq FROM planner_state_journal ORDER BY seq DESC LIMIT ?
      )
    `,
        ),
    };
}

function commitSnapshotWrite({
    createdAt,
    database,
    payloadJson,
    statements,
}: CommitSnapshotWriteArgs): void {
    statements.insertJournal.run(createdAt, SAVE_OPERATION, payloadJson);
    upsertSnapshot(database, payloadJson, createdAt);
    statements.trimJournal.run(JOURNAL_KEEP_ROWS);
    database.exec("COMMIT");
}

function snapshotWriteArgs(
    database: DatabaseSync,
    payloadJson: string,
): CommitSnapshotWriteArgs {
    return {
        createdAt: new Date().toISOString(),
        database,
        payloadJson,
        statements: journalStatements(database),
    };
}

function rollbackSnapshotWrite(
    database: DatabaseSync,
    error: unknown,
): PlannerSaveResult {
    database.exec("ROLLBACK");
    return returnErrorMessage(error);
}

/**
 * Persists snapshot+journal records transactionally.
 * @param database - Open SQLite handle.
 * @param payloadJson - Serialized state JSON payload.
 * @returns Save result.
 */
function writeSnapshotTransaction(
    database: DatabaseSync,
    payloadJson: string,
): PlannerSaveResult {
    database.exec("BEGIN IMMEDIATE");
    try {
        commitSnapshotWrite(snapshotWriteArgs(database, payloadJson));
        return { ok: true };
    } catch (error) {
        return rollbackSnapshotWrite(database, error);
    }
}

/**
 * Reads planner state from SQLite snapshot/journal.
 * @param userDataDir - App user-data directory.
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
        return loadSqliteState(DATABASE_PATH);
    } catch {
        return null;
    }
}

function loadSqliteState(databasePath: string): PlannerStateLoadResult | null {
    const DATABASE = openDatabase(databasePath);
    try {
        const SNAPSHOT_STATE = readSnapshotState(DATABASE);
        if (SNAPSHOT_STATE !== null) {
            return {
                source: "sqlite",
                sourcePath: databasePath,
                state: SNAPSHOT_STATE,
            };
        }
        return replayJournalState(databasePath, DATABASE);
    } finally {
        DATABASE.close();
    }
}

function replayedJournalStateResult(
    databasePath: string,
    recoveredState: LoadedPlannerState,
): PlannerStateLoadResult {
    return {
        source: "sqlite_journal_replay",
        sourcePath: databasePath,
        state: recoveredState,
        warningCode: "RECOVERED_FROM_JOURNAL",
        warningMessage:
            "Recovered saved data from journal replay after storage corruption.",
    };
}

function writeReplayedSnapshot(
    database: DatabaseSync,
    recoveredState: LoadedPlannerState,
): void {
    upsertSnapshot(
        database,
        JSON.stringify(recoveredState),
        new Date().toISOString(),
    );
}

function replayJournalState(
    databasePath: string,
    database: DatabaseSync,
): PlannerStateLoadResult | null {
    const RECOVERED_STATE = recoverStateFromJournal(database);
    if (RECOVERED_STATE === null) {
        return null;
    }
    writeReplayedSnapshot(database, RECOVERED_STATE);
    return replayedJournalStateResult(databasePath, RECOVERED_STATE);
}

/**
 * Writes planner state to SQLite snapshot+journal.
 * @param userDataDir - App user-data directory.
 * @param data - Serializable planner state payload.
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
        return returnErrorMessage(error);
    }
}
