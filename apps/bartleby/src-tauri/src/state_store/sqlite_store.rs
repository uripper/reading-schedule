use std::fs;
use std::path::Path;

use chrono::Utc;
use rusqlite::{params, Connection};
use serde_json::Value;

use super::paths::sqlite_state_path;
use super::types::{
    path_string, LoadResult, SOURCE_SQLITE, SOURCE_SQLITE_JOURNAL_REPLAY,
    WARNING_RECOVERED_FROM_JOURNAL,
};

const JOURNAL_KEEP_ROWS: i64 = 200;
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
    let parsed = serde_json::from_str::<Value>(payload_json).ok()?;
    if parsed.is_null() || parsed.is_object() {
        return Some(parsed);
    }
    None
}

#[cfg(test)]
mod tests {
    use std::env;
    use std::fs;

    use rusqlite::Connection;
    use serde_json::json;
    use uuid::Uuid;

    use super::{read_state_from_sqlite, write_state_to_sqlite};
    use crate::state_store::paths::sqlite_state_path;

    fn temp_state_directory() -> std::path::PathBuf {
        env::temp_dir().join(format!("bartleby-state-sqlite-{}", Uuid::new_v4()))
    }

    #[test]
    fn sqlite_store_round_trips_state() {
        let data_directory = temp_state_directory();
        let state = json!({ "books": [], "settings": { "start_date": "2026-01-01" } });
        write_state_to_sqlite(&data_directory, &state).expect("expected sqlite write");
        let load_result = read_state_from_sqlite(&data_directory).expect("expected sqlite state");
        assert_eq!(load_result.source, "sqlite");
        let _ = fs::remove_dir_all(&data_directory);
    }

    #[test]
    fn sqlite_store_recovers_from_journal() {
        let data_directory = temp_state_directory();
        write_state_to_sqlite(
            &data_directory,
            &json!({ "books": [], "revision": 1, "settings": { "start_date": "2026-01-01" } }),
        )
        .expect("expected first sqlite write");
        write_state_to_sqlite(
            &data_directory,
            &json!({ "books": [], "revision": 2, "settings": { "start_date": "2026-01-02" } }),
        )
        .expect("expected second sqlite write");
        let database =
            Connection::open(sqlite_state_path(&data_directory)).expect("expected sqlite database");
        database
            .execute(
                "UPDATE planner_state_snapshot SET payload_json = '{broken-json' WHERE id = 1",
                [],
            )
            .expect("expected snapshot corruption");
        let load_result =
            read_state_from_sqlite(&data_directory).expect("expected journal replay recovery");
        assert_eq!(load_result.source, "sqlite_journal_replay");
        assert_eq!(load_result.warning_code, Some("RECOVERED_FROM_JOURNAL"));
        let _ = fs::remove_dir_all(&data_directory);
    }
}
