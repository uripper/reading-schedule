use std::fs;
use std::path::Path;

use chrono::Utc;
use rusqlite::{params, Connection, OpenFlags, OptionalExtension};
use serde_json::Value;

use super::json_parse::parse_state_value;
use super::paths::sqlite_state_path;
use super::types::{
    path_string, LoadResult, SOURCE_SQLITE, SOURCE_SQLITE_JOURNAL_REPLAY,
    WARNING_RECOVERED_FROM_JOURNAL,
};

const JOURNAL_KEEP_ROWS: i64 = 5;
const SAVE_OPERATION: &str = "save_snapshot";
const SNAPSHOT_ROW_ID: i64 = 1;
const STATE_SCHEMA_VERSION: i64 = 1;

pub fn read_state_from_sqlite(data_directory: &Path) -> Option<LoadResult> {
    let database_path = sqlite_state_path(data_directory);
    if !database_path.exists() {
        return None;
    }
    read_state_from_sqlite_path(&database_path).ok().flatten()
}

pub fn read_state_from_sqlite_read_only_result(
    data_directory: &Path,
) -> Result<Option<LoadResult>, String> {
    let database_path = sqlite_state_path(data_directory);
    if !database_path.exists() {
        return Ok(None);
    }
    read_state_from_sqlite_path_read_only(&database_path)
}

pub fn read_state_from_sqlite_path(database_path: &Path) -> Result<Option<LoadResult>, String> {
    if !database_path.exists() {
        return Ok(None);
    }
    let database = open_database(database_path)?;
    let source_path = path_string(database_path);
    let snapshot_state = read_snapshot_state(&database);
    if let Some(snapshot_state) = snapshot_state {
        return Ok(Some(LoadResult {
            source: SOURCE_SQLITE,
            source_path,
            state: snapshot_state,
            warning_code: None,
            warning_message: None,
        }));
    }
    let Some(recovered_state) = recover_state_from_journal(&database) else {
        return Ok(None);
    };
    write_replayed_snapshot(&database, &recovered_state)?;
    Ok(Some(LoadResult {
        source: SOURCE_SQLITE_JOURNAL_REPLAY,
        source_path,
        state: recovered_state,
        warning_code: Some(WARNING_RECOVERED_FROM_JOURNAL),
        warning_message: Some(
            "Recovered saved data from journal replay after storage corruption.".to_string(),
        ),
    }))
}

pub fn write_state_to_sqlite(data_directory: &Path, state: &Value) -> Result<(), String> {
    fs::create_dir_all(data_directory)
        .map_err(|error| format!("Unable to create app data directory: {error}"))?;
    let database = open_database(&sqlite_state_path(data_directory))?;
    write_snapshot_transaction(&database, state)
}

fn read_state_from_sqlite_path_read_only(
    database_path: &Path,
) -> Result<Option<LoadResult>, String> {
    let database = open_read_only_database(database_path)?;
    let source_path = path_string(database_path);
    if let Some(snapshot_state) = read_snapshot_state_result(&database)? {
        return Ok(Some(sqlite_load_result(source_path, snapshot_state)));
    }
    let Some(recovered_state) = recover_state_from_journal_result(&database)? else {
        return Ok(None);
    };
    Ok(Some(journal_replay_load_result(
        source_path,
        recovered_state,
    )))
}

fn open_database(database_path: &Path) -> Result<Connection, String> {
    let database = Connection::open(database_path)
        .map_err(|error| format!("Unable to open state database: {error}"))?;
    database
        .execute_batch(
            "
            PRAGMA journal_mode=WAL;
            PRAGMA synchronous=FULL;
            PRAGMA foreign_keys=ON;
            CREATE TABLE IF NOT EXISTS planner_state_snapshot (
              id INTEGER PRIMARY KEY CHECK(id = 1),
              schema_version INTEGER NOT NULL,
              payload_json TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS planner_state_journal (
              seq INTEGER PRIMARY KEY AUTOINCREMENT,
              created_at TEXT NOT NULL,
              operation TEXT NOT NULL,
              payload_json TEXT NOT NULL
            );
            ",
        )
        .map_err(|error| format!("Unable to initialize state database: {error}"))?;
    Ok(database)
}

fn open_read_only_database(database_path: &Path) -> Result<Connection, String> {
    Connection::open_with_flags(database_path, OpenFlags::SQLITE_OPEN_READ_ONLY)
        .map_err(|error| format!("Unable to open state database read-only: {error}"))
}

fn read_snapshot_state(database: &Connection) -> Option<Value> {
    let row = database
        .query_row(
            "SELECT payload_json FROM planner_state_snapshot WHERE id = ?",
            [SNAPSHOT_ROW_ID],
            |row| row.get::<_, String>(0),
        )
        .ok()?;
    serde_json::from_str::<Value>(&row)
        .ok()
        .filter(|value| value.is_null() || value.is_object())
}

fn read_snapshot_state_result(database: &Connection) -> Result<Option<Value>, String> {
    let row = database
        .query_row(
            "SELECT payload_json FROM planner_state_snapshot WHERE id = ?",
            [SNAPSHOT_ROW_ID],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| format!("Unable to read SQLite state snapshot: {error}"))?;
    let Some(row) = row else {
        return Ok(None);
    };
    parsed_state_value(&row)
        .ok_or_else(|| "SQLite state snapshot payload was not valid state JSON.".to_string())
        .map(Some)
}

fn recover_state_from_journal(database: &Connection) -> Option<Value> {
    let mut statement = database
        .prepare("SELECT payload_json FROM planner_state_journal ORDER BY seq DESC LIMIT ?")
        .ok()?;
    let rows = statement
        .query_map([JOURNAL_KEEP_ROWS], |row| row.get::<_, String>(0))
        .ok()?;
    for payload_json in rows.flatten() {
        match parsed_state_value(&payload_json) {
            Some(parsed) => return Some(parsed),
            None => continue,
        }
    }
    None
}

fn recover_state_from_journal_result(database: &Connection) -> Result<Option<Value>, String> {
    let mut statement = database
        .prepare("SELECT payload_json FROM planner_state_journal ORDER BY seq DESC LIMIT ?")
        .map_err(|error| format!("Unable to read SQLite state journal: {error}"))?;
    let rows = statement
        .query_map([JOURNAL_KEEP_ROWS], |row| row.get::<_, String>(0))
        .map_err(|error| format!("Unable to iterate SQLite state journal: {error}"))?;
    for payload_json in rows {
        let payload_json =
            payload_json.map_err(|error| format!("Unable to read SQLite journal row: {error}"))?;
        match parsed_state_value(&payload_json) {
            Some(parsed) => return Ok(Some(parsed)),
            None => continue,
        }
    }
    Ok(None)
}

fn write_replayed_snapshot(database: &Connection, recovered_state: &Value) -> Result<(), String> {
    upsert_snapshot(database, recovered_state)
}

fn upsert_snapshot(database: &Connection, state: &Value) -> Result<(), String> {
    let payload_json = serde_json::to_string(state)
        .map_err(|error| format!("Unable to encode SQLite state payload: {error}"))?;
    database
        .execute(
            "
            INSERT INTO planner_state_snapshot (id, schema_version, payload_json, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              schema_version = excluded.schema_version,
              payload_json = excluded.payload_json,
              updated_at = excluded.updated_at
            ",
            params![
                SNAPSHOT_ROW_ID,
                STATE_SCHEMA_VERSION,
                payload_json,
                Utc::now().to_rfc3339()
            ],
        )
        .map_err(|error| format!("Unable to persist SQLite state: {error}"))?;
    Ok(())
}

fn write_snapshot_transaction(database: &Connection, state: &Value) -> Result<(), String> {
    let payload_json = serde_json::to_string(state)
        .map_err(|error| format!("Unable to encode SQLite state payload: {error}"))?;
    let transaction = database
        .unchecked_transaction()
        .map_err(|error| format!("Unable to start SQLite transaction: {error}"))?;
    transaction
        .execute(
            "
            INSERT INTO planner_state_journal (created_at, operation, payload_json)
            VALUES (?, ?, ?)
            ",
            params![Utc::now().to_rfc3339(), SAVE_OPERATION, payload_json],
        )
        .map_err(|error| format!("Unable to write SQLite journal: {error}"))?;
    upsert_snapshot(&transaction, state)?;
    transaction
        .execute(
            "
            DELETE FROM planner_state_journal
            WHERE seq NOT IN (
              SELECT seq FROM planner_state_journal ORDER BY seq DESC LIMIT ?
            )
            ",
            [JOURNAL_KEEP_ROWS],
        )
        .map_err(|error| format!("Unable to trim SQLite journal: {error}"))?;
    transaction
        .commit()
        .map_err(|error| format!("Unable to commit SQLite transaction: {error}"))?;
    Ok(())
}

fn parsed_state_value(payload_json: &str) -> Option<Value> {
    let parsed = parse_state_value(payload_json).ok()?;
    if parsed.is_null() || parsed.is_object() {
        return Some(parsed);
    }
    None
}

fn sqlite_load_result(source_path: String, state: Value) -> LoadResult {
    LoadResult {
        source: SOURCE_SQLITE,
        source_path,
        state,
        warning_code: None,
        warning_message: None,
    }
}

fn journal_replay_load_result(source_path: String, state: Value) -> LoadResult {
    LoadResult {
        source: SOURCE_SQLITE_JOURNAL_REPLAY,
        source_path,
        state,
        warning_code: Some(WARNING_RECOVERED_FROM_JOURNAL),
        warning_message: Some(
            "Recovered saved data from journal replay after storage corruption.".to_string(),
        ),
    }
}
