use std::fs;
use std::path::{Path, PathBuf};

use chrono::Utc;
use serde_json::Value;

use super::json_store::write_state_to_json;
use super::paths::{
    json_state_backup_path, json_state_path, sqlite_shm_path, sqlite_state_path, sqlite_wal_path,
};
use super::sqlite_store::{read_state_from_sqlite_path, write_state_to_sqlite};

pub struct RecoveryCounts {
    pub books: usize,
    pub schedule_completions: usize,
    pub schedule_rows: usize,
    pub sessions: usize,
}

pub struct RecoverySummary {
    pub backups: Vec<String>,
    pub counts: RecoveryCounts,
    pub input_path: String,
    pub source_type: String,
    pub user_data_dir: String,
}

type LoadedInputState = (String, Value);

pub fn recover_state_from_input_path(
    input_path: &Path,
    user_data_dir: &Path,
    force: bool,
) -> Result<RecoverySummary, String> {
    let (source_type, state) = load_input_state(input_path)?;
    if target_exists(user_data_dir) && !force {
        return Err("Refusing to overwrite existing state without --force.".to_string());
    }
    let backups = if force {
        backup_targets(user_data_dir)?
    } else {
        Vec::new()
    };
    write_state_to_json(user_data_dir, &state)?;
    let primary_path = json_state_path(user_data_dir);
    fs::copy(&primary_path, json_state_backup_path(user_data_dir))
        .map_err(|error| format!("Unable to write recovered JSON backup: {error}"))?;
    write_state_to_sqlite(user_data_dir, &state)?;
    Ok(RecoverySummary {
        backups,
        counts: count_entities(&state),
        input_path: input_path.to_string_lossy().into_owned(),
        source_type,
        user_data_dir: user_data_dir.to_string_lossy().into_owned(),
    })
}

fn backup_targets(user_data_dir: &Path) -> Result<Vec<String>, String> {
    let timestamp = Utc::now().format("%Y%m%d%H%M%S").to_string();
    let mut backups = Vec::new();
    for path in recovery_targets(user_data_dir) {
        maybe_push_backup(&mut backups, &path, &timestamp)?;
    }
    Ok(backups)
}

fn count_entities(state: &Value) -> RecoveryCounts {
    RecoveryCounts {
        books: state
            .get("books")
            .and_then(Value::as_array)
            .map(Vec::len)
            .unwrap_or(0),
        schedule_completions: state
            .get("schedule_completions")
            .and_then(Value::as_object)
            .map(|value| value.len())
            .unwrap_or(0),
        schedule_rows: state
            .get("last_result")
            .and_then(Value::as_object)
            .and_then(|value| value.get("schedule"))
            .and_then(Value::as_array)
            .map(Vec::len)
            .unwrap_or(0),
        sessions: state
            .get("sessions")
            .and_then(Value::as_array)
            .map(Vec::len)
            .unwrap_or(0),
    }
}

fn load_input_state(input_path: &Path) -> Result<LoadedInputState, String> {
    if input_path.extension().and_then(|value| value.to_str()) == Some("json") {
        let payload = fs::read_to_string(input_path)
            .map_err(|error| format!("Unable to read recovery input JSON: {error}"))?;
        let state = serde_json::from_str::<Value>(&payload)
            .map_err(|error| format!("Unable to parse recovery input JSON: {error}"))?;
        validate_recovered_state(&state)?;
        return Ok(("json".to_string(), state));
    }
    let Some(load_result) = read_state_from_sqlite_path(input_path)? else {
        return Err("Could not recover a valid planner state from SQLite input.".to_string());
    };
    validate_recovered_state(&load_result.state)?;
    Ok(("sqlite".to_string(), load_result.state))
}

fn recovery_targets(user_data_dir: &Path) -> [PathBuf; 5] {
    [
        json_state_path(user_data_dir),
        json_state_backup_path(user_data_dir),
        sqlite_state_path(user_data_dir),
        sqlite_wal_path(user_data_dir),
        sqlite_shm_path(user_data_dir),
    ]
}

fn target_exists(user_data_dir: &Path) -> bool {
    recovery_targets(user_data_dir)
        .iter()
        .any(|path| path.exists())
}

fn validate_recovered_state(state: &Value) -> Result<(), String> {
    let Some(state_object) = state.as_object() else {
        return Err("Recovered payload must be an object.".to_string());
    };
    let Some(books) = state_object.get("books") else {
        return Err("Recovered payload missing required `books`.".to_string());
    };
    if !books.is_array() {
        return Err("Recovered payload `books` must be an array.".to_string());
    }
    if !state_object.contains_key("settings") {
        return Err("Recovered payload missing required `settings`.".to_string());
    }
    Ok(())
}

fn backup_target(path: &Path, timestamp: &str) -> Result<String, String> {
    let backup_path = PathBuf::from(format!(
        "{}.pre_recover_{timestamp}.bak",
        path.to_string_lossy()
    ));
    fs::copy(path, &backup_path)
        .map_err(|error| format!("Unable to back up existing recovery target: {error}"))?;
    Ok(backup_path.to_string_lossy().into_owned())
}

fn maybe_push_backup(
    backups: &mut Vec<String>,
    path: &Path,
    timestamp: &str,
) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    backups.push(backup_target(path, timestamp)?);
    Ok(())
}
