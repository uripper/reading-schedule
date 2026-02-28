/**
 * @file SQLite planner state read/write helpers with tiny mutation journal.
 */
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import type {
	JsonValue,
	LoadedPlannerState,
	PlannerSaveResult,
	PlannerStateLoadResult,
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
	const database = new DatabaseSync(databasePath);
	database.exec("PRAGMA journal_mode=WAL;");
	database.exec("PRAGMA synchronous=FULL;");
	database.exec("PRAGMA foreign_keys=ON;");
	database.exec(`
    CREATE TABLE IF NOT EXISTS planner_state_snapshot (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      schema_version INTEGER NOT NULL,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
	database.exec(`
    CREATE TABLE IF NOT EXISTS planner_state_journal (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );
  `);
	return database;
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
	const row = database
		.prepare("SELECT payload_json FROM planner_state_snapshot WHERE id = 1")
		.get() as { payload_json: string } | undefined;
	if (!row) {
		return null;
	}
	try {
		return objectState(JSON.parse(row.payload_json) as unknown);
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
	const rows = database
		.prepare(
			"SELECT payload_json FROM planner_state_journal ORDER BY seq DESC LIMIT ?",
		)
		.all(JOURNAL_KEEP_ROWS) as Array<{ payload_json: string } | undefined>;
	for (const row of rows) {
		if (!row) {
			continue;
		}
		try {
			const parsed = JSON.parse(row.payload_json) as unknown;
			const state = objectState(parsed);
			if (state) {
				return state;
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
	const createdAt = new Date().toISOString();
	const insertJournal = database.prepare(
		`
      INSERT INTO planner_state_journal (created_at, operation, payload_json)
      VALUES (?, ?, ?)
    `,
	);
	const trimJournal = database.prepare(
		`
      DELETE FROM planner_state_journal
      WHERE seq NOT IN (
        SELECT seq FROM planner_state_journal ORDER BY seq DESC LIMIT ?
      )
    `,
	);
	database.exec("BEGIN IMMEDIATE");
	try {
		insertJournal.run(createdAt, SAVE_OPERATION, payloadJson);
		upsertSnapshot(database, payloadJson, createdAt);
		trimJournal.run(JOURNAL_KEEP_ROWS);
		database.exec("COMMIT");
		return { ok: true };
	} catch (error) {
		database.exec("ROLLBACK");
		if (error instanceof Error) {
			return { ok: false, error: error.message };
		}
		return { ok: false, error: String(error) };
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
	const databasePath = sqliteStatePath(userDataDir);
	if (!fs.existsSync(databasePath)) {
		return null;
	}
	try {
		const database = openDatabase(databasePath);
		try {
			const snapshotState = readSnapshotState(database);
			if (snapshotState) {
				return {
					state: snapshotState,
					source: "sqlite",
					sourcePath: databasePath,
				};
			}
			const recoveredState = recoverStateFromJournal(database);
			if (!recoveredState) {
				return null;
			}
			upsertSnapshot(
				database,
				JSON.stringify(recoveredState),
				new Date().toISOString(),
			);
			return {
				state: recoveredState,
				source: "sqlite_journal_replay",
				sourcePath: databasePath,
				warningCode: "RECOVERED_FROM_JOURNAL",
				warningMessage:
					"Recovered saved data from journal replay after storage corruption.",
			};
		} finally {
			database.close();
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
		const database = openDatabase(sqliteStatePath(userDataDir));
		try {
			return writeSnapshotTransaction(database, JSON.stringify(data));
		} finally {
			database.close();
		}
	} catch (error) {
		if (error instanceof Error) {
			return { ok: false, error: error.message };
		}
		return { ok: false, error: String(error) };
	}
}
