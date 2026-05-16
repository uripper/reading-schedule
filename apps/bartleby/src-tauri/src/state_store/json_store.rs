use std::fs;
use std::path::Path;

use serde_json::Value;

use super::json_parse::parse_state_value;
use super::paths::{json_state_backup_path, json_state_path, json_state_temp_path};
use super::types::{
    path_string, LoadResult, SOURCE_JSON_BACKUP, SOURCE_JSON_PRIMARY, WARNING_RECOVERED_FROM_BACKUP,
};

const UTF8_BOM: &str = "\u{feff}";

pub fn read_state_from_json(data_directory: &Path) -> Option<LoadResult> {
    read_state_from_json_result(data_directory).ok().flatten()
}

pub fn read_state_from_json_result(data_directory: &Path) -> Result<Option<LoadResult>, String> {
    let primary_path = json_state_path(data_directory);
    let primary_result = read_json_object_file_result(&primary_path);
    if let Ok(Some(state)) = primary_result {
        return Ok(Some(LoadResult {
            source: SOURCE_JSON_PRIMARY,
            source_path: path_string(&primary_path),
            state,
            warning_code: None,
            warning_message: None,
        }));
    }
    let backup_path = json_state_backup_path(data_directory);
    let backup_result = read_json_object_file_result(&backup_path);
    if let Ok(Some(state)) = backup_result {
        return Ok(Some(LoadResult {
            source: SOURCE_JSON_BACKUP,
            source_path: path_string(&backup_path),
            state,
            warning_code: Some(WARNING_RECOVERED_FROM_BACKUP),
            warning_message: Some(
                "Recovered saved data from backup copy. Recent unsaved changes may be missing."
                    .to_string(),
            ),
        }));
    }
    json_result_error(primary_result, backup_result)
}

pub fn write_state_to_json(data_directory: &Path, state: &Value) -> Result<(), String> {
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
        remove_existing_backup(&backup_path)?;
        fs::rename(&primary_path, &backup_path)
            .map_err(|error| format!("Unable to backup existing state JSON: {error}"))?;
    }
    fs::rename(&temp_path, &primary_path)
        .map_err(|error| format!("Unable to persist state JSON: {error}"))?;
    Ok(())
}

fn normalize_state(value: Value) -> Option<Value> {
    if value.is_null() || value.is_object() {
        return Some(value);
    }
    None
}

fn read_json_object_file_result(path: &Path) -> Result<Option<Value>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let text = fs::read_to_string(path)
        .map_err(|error| format!("Unable to read state JSON {}: {error}", path_string(path)))?;
    let parsed = parse_state_value(strip_utf8_bom(&text))
        .map_err(|error| format!("Unable to parse state JSON {}: {error}", path_string(path)))?;
    match normalize_state(parsed) {
        Some(state) => Ok(Some(state)),
        None => Err(format!(
            "State JSON must be an object or null: {}",
            path_string(path)
        )),
    }
}

fn json_result_error(
    primary_result: Result<Option<Value>, String>,
    backup_result: Result<Option<Value>, String>,
) -> Result<Option<LoadResult>, String> {
    let errors = [primary_result.err(), backup_result.err()]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();
    if errors.is_empty() {
        return Ok(None);
    }
    Err(errors.join(" "))
}

fn remove_existing_backup(backup_path: &Path) -> Result<(), String> {
    if !backup_path.exists() {
        return Ok(());
    }
    fs::remove_file(backup_path).map_err(|error| format!("Unable to rotate state backup: {error}"))
}

fn strip_utf8_bom(text: &str) -> &str {
    if let Some(stripped) = text.strip_prefix(UTF8_BOM) {
        return stripped;
    }
    text
}

#[cfg(test)]
mod tests {
    use std::env;
    use std::fs;

    use serde_json::json;
    use uuid::Uuid;

    use super::{read_state_from_json, write_state_to_json};
    use crate::state_store::paths::json_state_path;

    fn temp_state_directory() -> std::path::PathBuf {
        env::temp_dir().join(format!("bartleby-state-json-{}", Uuid::new_v4()))
    }

    #[test]
    fn read_state_from_json_recovers_from_backup() {
        let data_directory = temp_state_directory();
        let first_state = json!({ "books": [], "settings": { "start_date": "2026-01-01" } });
        let second_state = json!({ "books": [], "settings": { "start_date": "2026-02-01" } });
        write_state_to_json(&data_directory, &first_state).expect("expected first json write");
        write_state_to_json(&data_directory, &second_state).expect("expected second json write");
        fs::write(json_state_path(&data_directory), "{broken").expect("expected corrupted primary");
        let load_result = read_state_from_json(&data_directory).expect("expected backup recovery");
        assert_eq!(load_result.source, "json_backup");
        assert_eq!(load_result.warning_code, Some("RECOVERED_FROM_BACKUP"));
        let _ = fs::remove_dir_all(&data_directory);
    }
}
