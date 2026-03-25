mod json_store;
mod migrations;
pub(crate) mod paths;
mod recovery;
mod sqlite_store;
mod types;

use std::fs;
use std::path::Path;

use serde_json::{Map, Value};
use tauri::AppHandle;

use crate::{app_paths, cover_store};
use json_store::{read_state_from_json, write_state_to_json};
use migrations::{migrate_loaded_state, with_migration_warning};
use paths::{json_state_backup_path, json_state_path, sqlite_state_path};
pub use recovery::{recover_state_from_input_path, RecoverySummary};
use sqlite_store::{read_state_from_sqlite, write_state_to_sqlite};
use types::{
    path_string, LoadResult, SOURCE_FRESH, WARNING_MIGRATED_JSON_TO_SQLITE,
    WARNING_STATE_RESET_FRESH,
};

pub fn load_state(app: &AppHandle) -> Result<Value, String> {
    let canonical_directory = app_paths::canonical_data_directory(app)?;
    if has_persisted_artifacts(&canonical_directory) {
        return Ok(load_canonical_state(&canonical_directory).into_value());
    }
    let Some(legacy_directory) = app_paths::legacy_electron_data_directory() else {
        return Ok(fresh_state_result(&canonical_directory).into_value());
    };
    Ok(load_legacy_state(&canonical_directory, &legacy_directory)?.into_value())
}

pub fn save_state(app: &AppHandle, state: &Value) -> Result<Value, String> {
    let data_directory = app_paths::canonical_data_directory(app)?;
    save_state_to_directory(&data_directory, state)
}

pub fn save_state_to_directory(data_directory: &Path, state: &Value) -> Result<Value, String> {
    let warning_message = persist_state_to_directory(data_directory, state)?;
    Ok(save_result_value(warning_message))
}

fn decorate_primary_json_migration(load_result: LoadResult) -> LoadResult {
    if load_result.source != types::SOURCE_JSON_PRIMARY {
        return load_result;
    }
    LoadResult {
        warning_code: Some(WARNING_MIGRATED_JSON_TO_SQLITE),
        warning_message: Some("Migrated saved data from JSON storage to SQLite.".to_string()),
        ..load_result
    }
}

fn fresh_state_result(data_directory: &Path) -> LoadResult {
    LoadResult {
        source: SOURCE_FRESH,
        source_path: path_string(data_directory),
        state: Value::Null,
        warning_code: None,
        warning_message: None,
    }
}

fn has_bootstrap_state(state: &Value) -> bool {
    let Some(state_object) = state.as_object() else {
        return false;
    };
    state_object.contains_key("books") && state_object.contains_key("settings")
}

fn has_persisted_artifacts(data_directory: &Path) -> bool {
    fs::exists(sqlite_state_path(data_directory)).unwrap_or(false)
        || fs::exists(json_state_path(data_directory)).unwrap_or(false)
        || fs::exists(json_state_backup_path(data_directory)).unwrap_or(false)
}

fn legacy_migration_message(error: &str) -> String {
    format!("Loaded legacy saved data but could not migrate it to Tauri storage: {error}")
}

fn load_canonical_state(data_directory: &Path) -> LoadResult {
    if let Some(load_result) = preferred_state_result_in_place(data_directory) {
        return normalize_cover_state_in_place(data_directory, load_result);
    }
    if has_persisted_artifacts(data_directory) {
        return reset_fresh_state_result(data_directory);
    }
    fresh_state_result(data_directory)
}

fn load_legacy_state(
    canonical_directory: &Path,
    legacy_directory: &Path,
) -> Result<LoadResult, String> {
    if !has_persisted_artifacts(legacy_directory) {
        return Ok(fresh_state_result(canonical_directory));
    }
    let Some(load_result) = preferred_state_result_read_only(legacy_directory) else {
        return Ok(reset_fresh_state_result(canonical_directory));
    };
    if !has_bootstrap_state(&load_result.state) {
        return Ok(load_result);
    }
    let normalized_state =
        cover_store::normalize_state_cover_paths(&load_result.state, canonical_directory)?;
    let migrated_result = load_result.clone().with_state(normalized_state.clone());
    match persist_state_to_directory(canonical_directory, &normalized_state) {
        Ok(None) => Ok(migrated_result),
        Ok(Some(warning_message)) => Ok(migrated_result.with_warning_message(warning_message)),
        Err(error) => Ok(migrated_result.with_warning_message(legacy_migration_message(&error))),
    }
}

fn normalize_cover_state_in_place(data_directory: &Path, load_result: LoadResult) -> LoadResult {
    if !has_bootstrap_state(&load_result.state) {
        return load_result;
    }
    let normalized_state =
        match cover_store::normalize_state_cover_paths(&load_result.state, data_directory) {
            Ok(normalized_state) => normalized_state,
            Err(_) => {
                return load_result;
            }
        };
    if normalized_state == load_result.state {
        return load_result;
    }
    if persist_state_to_directory(data_directory, &normalized_state).is_err() {
        return load_result;
    }
    load_result.with_state(normalized_state)
}

fn persist_state_to_directory(
    data_directory: &Path,
    state: &Value,
) -> Result<Option<String>, String> {
    write_state_to_sqlite(data_directory, state)?;
    match write_state_to_json(data_directory, state) {
        Ok(()) => Ok(None),
        Err(error) => Ok(Some(format!(
            "SQLite save succeeded but JSON compatibility write failed: {error}"
        ))),
    }
}

fn preferred_state_result_in_place(data_directory: &Path) -> Option<LoadResult> {
    let sqlite_result = read_state_from_sqlite(data_directory);
    if let Some(load_result) = bootstrap_state_result(&sqlite_result) {
        return rewrite_migrated_state_in_place(data_directory, load_result);
    }
    let json_result = read_state_from_json(data_directory);
    if let Some(load_result) = json_result {
        let load_result = migrated_json_result_in_place(data_directory, load_result);
        return rewrite_migrated_state_in_place(data_directory, load_result);
    }
    sqlite_result
}

fn preferred_state_result_read_only(data_directory: &Path) -> Option<LoadResult> {
    let sqlite_result = read_state_from_sqlite(data_directory);
    if let Some(load_result) = bootstrap_state_result(&sqlite_result) {
        return rewrite_migrated_state_read_only(load_result);
    }
    let json_result = read_state_from_json(data_directory);
    if let Some(load_result) = json_result {
        let load_result = decorate_primary_json_migration(load_result);
        return rewrite_migrated_state_read_only(load_result);
    }
    sqlite_result
}

fn migrated_json_result_in_place(data_directory: &Path, load_result: LoadResult) -> LoadResult {
    let load_result = decorate_primary_json_migration(load_result);
    if let Err(error) = write_state_to_sqlite(data_directory, &load_result.state) {
        return load_result.with_warning_message(format!(
            "Loaded JSON fallback but SQLite migration failed: {error}"
        ));
    }
    load_result
}

fn reset_fresh_state_result(data_directory: &Path) -> LoadResult {
    LoadResult {
        warning_code: Some(WARNING_STATE_RESET_FRESH),
        warning_message: Some("Saved state was unreadable. Started with fresh data.".to_string()),
        ..fresh_state_result(data_directory)
    }
}

fn rewrite_migrated_state_in_place(
    data_directory: &Path,
    load_result: LoadResult,
) -> Option<LoadResult> {
    let Some(migration) = migrate_loaded_state(&load_result.state).ok()? else {
        return Some(load_result);
    };
    let migrated_result = load_result.with_state(migration.migrated_state);
    if !migration.should_rewrite {
        return Some(migrated_result);
    }
    if persist_state_to_directory(data_directory, &migrated_result.state).is_err() {
        return None;
    }
    Some(with_migration_warning(migrated_result))
}

fn rewrite_migrated_state_read_only(load_result: LoadResult) -> Option<LoadResult> {
    let Some(migration) = migrate_loaded_state(&load_result.state).ok()? else {
        return Some(load_result);
    };
    let migrated_result = load_result.with_state(migration.migrated_state);
    if !migration.should_rewrite {
        return Some(migrated_result);
    }
    Some(with_migration_warning(migrated_result))
}

fn save_result_value(warning_message: Option<String>) -> Value {
    let mut payload = Map::new();
    payload.insert("ok".to_string(), Value::Bool(true));
    if let Some(warning_message) = warning_message {
        payload.insert("warningMessage".to_string(), Value::String(warning_message));
    }
    Value::Object(payload)
}

#[cfg(test)]
pub fn load_canonical_state_for_test(data_directory: &Path) -> LoadResult {
    load_canonical_state(data_directory)
}

#[cfg(test)]
pub fn load_legacy_state_for_test(
    canonical_directory: &Path,
    legacy_directory: &Path,
) -> Result<LoadResult, String> {
    load_legacy_state(canonical_directory, legacy_directory)
}

fn bootstrap_state_result(load_result: &Option<LoadResult>) -> Option<LoadResult> {
    let load_result = load_result.clone()?;
    if has_bootstrap_state(&load_result.state) {
        return Some(load_result);
    }
    None
}
