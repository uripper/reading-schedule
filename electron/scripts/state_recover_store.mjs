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
 * @param {string} payloadText - Raw JSON payload text.
 * @returns {Record<string, unknown>} Parsed planner state object.
 */
function parseState(payloadText) {
    const PARSED = JSON.parse(payloadText);
    if (!PARSED || Array.isArray(PARSED) || typeof PARSED !== "object") {
        throw new TypeError("Recovered payload must be an object.");
    }
    const STATE = PARSED;
    if (!Object.hasOwn(STATE, "settings")) {
        throw new TypeError("Recovered payload missing required `settings`.");
    }
    if (!Object.hasOwn(STATE, "books")) {
        throw new TypeError("Recovered payload missing required `books`.");
    }
    if (!Array.isArray(STATE.books)) {
        throw new TypeError("Recovered payload `books` must be an array.");
    }
    return STATE;
}

/**
 * Reads planner state from SQLite snapshot, then journal fallback.
 * @param {string} inputPath - SQLite file path.
 * @returns {Record<string, unknown>} Recovered planner state object.
 */
function readStateFromSqlite(inputPath) {
    const DATABASE = new DatabaseSync(inputPath);
    try {
        const SNAPSHOT = DATABASE.prepare(
            "SELECT payload_json FROM planner_state_snapshot WHERE id = ?",
        ).get(SNAPSHOT_ROW_ID);
        if (SNAPSHOT && typeof SNAPSHOT.payload_json === "string") {
            try {
                return parseState(SNAPSHOT.payload_json);
            } catch {
                // Continue to journal replay.
            }
        }
        const ROWS = DATABASE.prepare(
            "SELECT payload_json FROM planner_state_journal ORDER BY seq DESC LIMIT ?",
        ).all(JOURNAL_KEEP_ROWS);
        for (const ROW of ROWS) {
            if (!ROW || typeof ROW.payload_json !== "string") {
                continue;
            }
            try {
                return parseState(ROW.payload_json);
            } catch {
                // Continue scanning older rows.
            }
        }
    } finally {
        DATABASE.close();
    }
    throw new TypeError(
        "Could not recover a valid planner state from SQLite input.",
    );
}

/**
 * Reads planner state from JSON or SQLite input path.
 * @param {string} inputPath - Source path.
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
 * @param {string} userDataDir - Target user-data directory.
 * @param {string} timestamp - Safe timestamp suffix.
 * @returns {string[]} Created backup file paths.
 */
export function backupTargets(userDataDir, timestamp) {
    const TARGETS = [
        path.join(userDataDir, JSON_STATE_FILE),
        path.join(userDataDir, JSON_BACKUP_FILE),
        path.join(userDataDir, SQLITE_STATE_FILE),
        path.join(userDataDir, SQLITE_WAL_FILE),
        path.join(userDataDir, SQLITE_SHM_FILE),
    ];
    const BACKUPS = [];
    for (const FILE_PATH of TARGETS) {
        if (!fs.existsSync(FILE_PATH)) {
            continue;
        }
        const BACKUP_PATH = `${FILE_PATH}.pre_recover_${timestamp}.bak`;
        fs.copyFileSync(FILE_PATH, BACKUP_PATH);
        BACKUPS.push(BACKUP_PATH);
    }
    return BACKUPS;
}

/**
 * Writes recovered planner state to JSON + SQLite targets in user data.
 * @param {string} userDataDir - Target user-data directory.
 * @param {Record<string, unknown>} state - Recovered planner state object.
 */
export function writeRecoveredState(userDataDir, state) {
    fs.mkdirSync(userDataDir, { recursive: true });
    const JSON_PATH = path.join(userDataDir, JSON_STATE_FILE);
    const JSON_BACKUP_PATH = path.join(userDataDir, JSON_BACKUP_FILE);
    fs.writeFileSync(
        JSON_BACKUP_PATH,
        JSON.stringify(state, null, JSON_INDENT_SPACES),
        "utf8",
    );
    fs.writeFileSync(
        JSON_PATH,
        JSON.stringify(state, null, JSON_INDENT_SPACES),
        "utf8",
    );
    const DATABASE_PATH = path.join(userDataDir, SQLITE_STATE_FILE);
    const DATABASE = new DatabaseSync(DATABASE_PATH);
    try {
        DATABASE.exec("PRAGMA journal_mode=WAL;");
        DATABASE.exec("PRAGMA synchronous=FULL;");
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
        const NOW_ISO = new Date().toISOString();
        const PAYLOAD = JSON.stringify(state);
        DATABASE.exec("BEGIN IMMEDIATE");
        DATABASE.prepare(
            "INSERT INTO planner_state_journal (created_at, operation, payload_json) VALUES (?, ?, ?)",
        ).run(NOW_ISO, SAVE_OPERATION, PAYLOAD);
        DATABASE.prepare(
            `
          INSERT INTO planner_state_snapshot (id, schema_version, payload_json, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            schema_version = excluded.schema_version,
            payload_json = excluded.payload_json,
            updated_at = excluded.updated_at
        `,
        ).run(SNAPSHOT_ROW_ID, STATE_SCHEMA_VERSION, PAYLOAD, NOW_ISO);
        DATABASE.prepare(
            `
          DELETE FROM planner_state_journal
          WHERE seq NOT IN (
            SELECT seq FROM planner_state_journal ORDER BY seq DESC LIMIT ?
          )
        `,
        ).run(JOURNAL_KEEP_ROWS);
        DATABASE.exec("COMMIT");
    } catch (error) {
        DATABASE.exec("ROLLBACK");
        throw error;
    } finally {
        DATABASE.close();
    }
}
