use std::fs;
use std::path::{Path, PathBuf};

use rusqlite::{params, Connection};
use serde_json::{json, Value};

const JSON_STATE_BACKUP_FILE_NAME: &str = "planner_state.json.bak";
const JSON_STATE_FILE_NAME: &str = "planner_state.json";
const JSON_STATE_TEMP_FILE_NAME: &str = "planner_state.json.tmp";
const SQLITE_STATE_FILE_NAME: &str = "planner_state.sqlite3";
const STATE_SCHEMA_VERSION: i64 = 1;

pub fn load_state(data_directory: &Path) -> Result<Value, String> {
    if let Some(state) = read_state_from_sqlite(data_directory)? {
        return Ok(json!({
            "source": "sqlite",
            "sourcePath": sqlite_state_path(data_directory).to_string_lossy(),
            "state": state,
        }));
    }
    if let Some(state) = read_json_state(&json_state_path(data_directory))? {
        write_state_to_sqlite(data_directory, &state)?;
        return Ok(json!({
            "source": "json_primary",
            "sourcePath": json_state_path(data_directory).to_string_lossy(),
            "state": state,
            "warningCode": "MIGRATED_JSON_TO_SQLITE",
            "warningMessage": "Migrated saved data from JSON storage to SQLite.",
        }));
    }
    Ok(json!({
        "source": "fresh",
        "sourcePath": sqlite_state_path(data_directory).to_string_lossy(),
        "state": Value::Null,
    }))
}

pub fn save_state(data_directory: &Path, state: &Value) -> Result<Value, String> {
    write_state_to_sqlite(data_directory, state)?;
    write_state_to_json(data_directory, state)?;
    Ok(json!({ "ok": true }))
}

fn json_state_backup_path(data_directory: &Path) -> PathBuf {
    data_directory.join(JSON_STATE_BACKUP_FILE_NAME)
}

fn json_state_path(data_directory: &Path) -> PathBuf {
    data_directory.join(JSON_STATE_FILE_NAME)
}

fn json_state_temp_path(data_directory: &Path) -> PathBuf {
    data_directory.join(JSON_STATE_TEMP_FILE_NAME)
}

fn sqlite_state_path(data_directory: &Path) -> PathBuf {
    data_directory.join(SQLITE_STATE_FILE_NAME)
}

fn normalize_state(value: Value) -> Option<Value> {
    if value.is_null() || value.is_object() {
        return Some(value);
    }
    None
}

fn read_json_state(path: &Path) -> Result<Option<Value>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let contents =
        fs::read_to_string(path).map_err(|error| format!("Unable to read saved state: {error}"))?;
    let parsed = serde_json::from_str::<Value>(&contents)
        .map_err(|error| format!("Unable to parse saved state JSON: {error}"))?;
    Ok(normalize_state(parsed))
}

fn open_database(database_path: &Path) -> Result<Connection, String> {
    let database = Connection::open(database_path)
        .map_err(|error| format!("Unable to open state database: {error}"))?;
    database
        .execute_batch(
            "
            PRAGMA journal_mode=WAL;
            PRAGMA synchronous=FULL;
            CREATE TABLE IF NOT EXISTS planner_state_snapshot (
              id INTEGER PRIMARY KEY CHECK(id = 1),
              schema_version INTEGER NOT NULL,
              payload_json TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            ",
        )
        .map_err(|error| format!("Unable to initialize state database: {error}"))?;
    Ok(database)
}

fn read_state_from_sqlite(data_directory: &Path) -> Result<Option<Value>, String> {
    let database_path = sqlite_state_path(data_directory);
    if !database_path.exists() {
        return Ok(None);
    }
    let database = open_database(&database_path)?;
    let row = database
        .query_row(
            "SELECT payload_json FROM planner_state_snapshot WHERE id = 1",
            [],
            |row| row.get::<_, String>(0),
        )
        .map(Some)
        .or_else(|error| {
            if error == rusqlite::Error::QueryReturnedNoRows {
                return Ok(None);
            }
            Err(error)
        })
        .map_err(|error| format!("Unable to read SQLite state: {error}"))?;
    let Some(payload_json) = row else {
        return Ok(None);
    };
    let parsed = serde_json::from_str::<Value>(&payload_json)
        .map_err(|error| format!("Unable to parse SQLite state JSON: {error}"))?;
    Ok(normalize_state(parsed))
}

fn write_state_to_json(data_directory: &Path, state: &Value) -> Result<(), String> {
    fs::create_dir_all(data_directory)
        .map_err(|error| format!("Unable to create app data directory: {error}"))?;
    let primary_path = json_state_path(data_directory);
    let backup_path = json_state_backup_path(data_directory);
    let temp_path = json_state_temp_path(data_directory);
    let payload = serde_json::to_string_pretty(state)
        .map_err(|error| format!("Unable to encode state payload: {error}"))?;
    fs::write(&temp_path, payload)
        .map_err(|error| format!("Unable to stage state JSON: {error}"))?;
    if primary_path.exists() {
        if backup_path.exists() {
            fs::remove_file(&backup_path)
                .map_err(|error| format!("Unable to rotate state backup: {error}"))?;
        }
        fs::rename(&primary_path, &backup_path)
            .map_err(|error| format!("Unable to backup existing state JSON: {error}"))?;
    }
    fs::rename(&temp_path, &primary_path)
        .map_err(|error| format!("Unable to persist state JSON: {error}"))?;
    Ok(())
}

fn write_state_to_sqlite(data_directory: &Path, state: &Value) -> Result<(), String> {
    fs::create_dir_all(data_directory)
        .map_err(|error| format!("Unable to create app data directory: {error}"))?;
    let payload_json = serde_json::to_string(state)
        .map_err(|error| format!("Unable to encode SQLite state payload: {error}"))?;
    let database = open_database(&sqlite_state_path(data_directory))?;
    database
        .execute(
            "
            INSERT INTO planner_state_snapshot (id, schema_version, payload_json, updated_at)
            VALUES (1, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              schema_version = excluded.schema_version,
              payload_json = excluded.payload_json,
              updated_at = excluded.updated_at
            ",
            params![
                STATE_SCHEMA_VERSION,
                payload_json,
                chrono::Utc::now().to_rfc3339()
            ],
        )
        .map_err(|error| format!("Unable to persist SQLite state: {error}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::env;
    use std::fs;

    use serde_json::{json, Value};
    use uuid::Uuid;

    use super::{json_state_path, load_state, save_state, sqlite_state_path};

    fn temp_state_directory() -> std::path::PathBuf {
        env::temp_dir().join(format!("bartleby-state-store-{}", Uuid::new_v4()))
    }

    #[test]
    fn save_and_load_state_uses_sqlite_primary() {
        let data_directory = temp_state_directory();
        let state = json!({
            "books": [],
            "settings": { "minutes_per_day": 30 }
        });
        save_state(&data_directory, &state).expect("expected saved state");
        assert!(
            sqlite_state_path(&data_directory).exists(),
            "expected sqlite state file"
        );
        assert!(
            json_state_path(&data_directory).exists(),
            "expected json compatibility file"
        );
        let loaded = load_state(&data_directory).expect("expected loaded state");
        assert_eq!(
            loaded.get("source"),
            Some(&Value::String("sqlite".to_string()))
        );
        assert_eq!(loaded.get("state"), Some(&state));
        let _ = fs::remove_dir_all(&data_directory);
    }

    #[test]
    fn load_state_migrates_json_into_sqlite() {
        let data_directory = temp_state_directory();
        fs::create_dir_all(&data_directory).expect("expected temp state directory");
        let state = json!({
            "books": [],
            "settings": { "minutes_per_day": 45 }
        });
        fs::write(
            json_state_path(&data_directory),
            serde_json::to_string_pretty(&state).expect("expected json payload"),
        )
        .expect("expected json state file");
        let loaded = load_state(&data_directory).expect("expected loaded state");
        assert_eq!(
            loaded.get("warningCode"),
            Some(&Value::String("MIGRATED_JSON_TO_SQLITE".to_string()))
        );
        assert!(
            sqlite_state_path(&data_directory).exists(),
            "expected sqlite migration"
        );
        let _ = fs::remove_dir_all(&data_directory);
    }
}
