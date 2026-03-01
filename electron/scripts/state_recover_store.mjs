import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const JSON_STATE_FILE = "planner_state.json";
const JSON_BACKUP_FILE = "planner_state.json.bak";
const SQLITE_STATE_FILE = "planner_state.sqlite3";
const SQLITE_WAL_FILE = "planner_state.sqlite3-wal";
const SQLITE_SHM_FILE = "planner_state.sqlite3-shm";
const JOURNAL_KEEP_ROWS = 200;
const SNAPSHOT_ROW_ID = 1;
const STATE_SCHEMA_VERSION = 1;
const SAVE_OPERATION = "save_snapshot";
const JSON_INDENT_SPACES = 2;

/**
 * Parses a JSON payload and validates the base planner-state shape.
 * @param {string} payloadText Raw JSON payload text.
 * @returns {Record<string, unknown>} Parsed planner state object.
 */
function parseState(payloadText) {
    const parsed = JSON.parse(payloadText);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        throw new TypeError("Recovered payload must be an object.");
    }
    const state = parsed;
    if (!Object.hasOwn(state, "settings")) {
        throw new TypeError("Recovered payload missing required `settings`.");
    }
    if (!Object.hasOwn(state, "books")) {
        throw new TypeError("Recovered payload missing required `books`.");
    }
    if (!Array.isArray(state.books)) {
        throw new TypeError("Recovered payload `books` must be an array.");
    }
    return state;
}

/**
 * Reads planner state from SQLite snapshot, then journal fallback.
 * @param {string} inputPath SQLite file path.
 * @returns {Record<string, unknown>} Recovered planner state object.
 */
function readStateFromSqlite(inputPath) {
    const database = new DatabaseSync(inputPath);
    try {
        const snapshot = database
            .prepare(
                "SELECT payload_json FROM planner_state_snapshot WHERE id = ?",
            )
            .get(SNAPSHOT_ROW_ID);
        if (snapshot && typeof snapshot.payload_json === "string") {
            try {
                return parseState(snapshot.payload_json);
            } catch {
                // Continue to journal replay.
            }
        }
        const rows = database
            .prepare(
                "SELECT payload_json FROM planner_state_journal ORDER BY seq DESC LIMIT ?",
            )
            .all(JOURNAL_KEEP_ROWS);
        for (const row of rows) {
            if (!row || typeof row.payload_json !== "string") {
                continue;
            }
            try {
                return parseState(row.payload_json);
            } catch {
                // Continue scanning older rows.
            }
        }
    } finally {
        database.close();
    }
    throw new TypeError(
        "Could not recover a valid planner state from SQLite input.",
    );
}

/**
 * Reads planner state from JSON or SQLite input path.
 * @param {string} inputPath Source path.
 * @returns {{ sourceType: string, state: Record<string, unknown> }} Recovered state and source type.
 */
export function readStateFromInput(inputPath) {
    if (inputPath.endsWith(".json")) {
        return {
            sourceType: "json",
            state: parseState(fs.readFileSync(inputPath, "utf8")),
        };
    }
    return {
        sourceType: "sqlite",
        state: readStateFromSqlite(inputPath),
    };
}

/**
 * Copies existing target files to timestamped backups before recovery writes.
 * @param {string} userDataDir Target user-data directory.
 * @param {string} timestamp Safe timestamp suffix.
 * @returns {string[]} Created backup file paths.
 */
export function backupTargets(userDataDir, timestamp) {
    const targets = [
        path.join(userDataDir, JSON_STATE_FILE),
        path.join(userDataDir, JSON_BACKUP_FILE),
        path.join(userDataDir, SQLITE_STATE_FILE),
        path.join(userDataDir, SQLITE_WAL_FILE),
        path.join(userDataDir, SQLITE_SHM_FILE),
    ];
    const backups = [];
    for (const filePath of targets) {
        if (!fs.existsSync(filePath)) {
            continue;
        }
        const backupPath = `${filePath}.pre_recover_${timestamp}.bak`;
        fs.copyFileSync(filePath, backupPath);
        backups.push(backupPath);
    }
    return backups;
}

/**
 * Writes recovered planner state to JSON + SQLite targets in user data.
 * @param {string} userDataDir Target user-data directory.
 * @param {Record<string, unknown>} state Recovered planner state object.
 */
export function writeRecoveredState(userDataDir, state) {
    fs.mkdirSync(userDataDir, { recursive: true });
    const jsonPath = path.join(userDataDir, JSON_STATE_FILE);
    const jsonBackupPath = path.join(userDataDir, JSON_BACKUP_FILE);
    fs.writeFileSync(
        jsonBackupPath,
        JSON.stringify(state, null, JSON_INDENT_SPACES),
        "utf8",
    );
    fs.writeFileSync(
        jsonPath,
        JSON.stringify(state, null, JSON_INDENT_SPACES),
        "utf8",
    );
    const databasePath = path.join(userDataDir, SQLITE_STATE_FILE);
    const database = new DatabaseSync(databasePath);
    try {
        database.exec("PRAGMA journal_mode=WAL;");
        database.exec("PRAGMA synchronous=FULL;");
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
        const nowIso = new Date().toISOString();
        const payload = JSON.stringify(state);
        database.exec("BEGIN IMMEDIATE");
        database
            .prepare(
                "INSERT INTO planner_state_journal (created_at, operation, payload_json) VALUES (?, ?, ?)",
            )
            .run(nowIso, SAVE_OPERATION, payload);
        database
            .prepare(
                `
          INSERT INTO planner_state_snapshot (id, schema_version, payload_json, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            schema_version = excluded.schema_version,
            payload_json = excluded.payload_json,
            updated_at = excluded.updated_at
        `,
            )
            .run(SNAPSHOT_ROW_ID, STATE_SCHEMA_VERSION, payload, nowIso);
        database
            .prepare(
                `
          DELETE FROM planner_state_journal
          WHERE seq NOT IN (
            SELECT seq FROM planner_state_journal ORDER BY seq DESC LIMIT ?
          )
        `,
            )
            .run(JOURNAL_KEEP_ROWS);
        database.exec("COMMIT");
    } catch (error) {
        database.exec("ROLLBACK");
        throw error;
    } finally {
        database.close();
    }
}
