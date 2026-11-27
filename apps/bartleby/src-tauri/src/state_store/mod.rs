mod cover_normalization;
mod json_parse;
mod json_store;
mod legacy;
mod migrations;
pub(crate) mod paths;
mod pre_workspace_backup;
mod recovery;
mod sqlite_store;
#[cfg(test)]
mod sqlite_store_tests;
mod types;

use std::fs;
use std::path::Path;
use std::sync::Mutex;

use serde_json::{Map, Value};
use tauri::AppHandle;

use crate::{app_paths, workspace_model};
pub use cover_normalization::{run_state_maintenance, StateMaintenanceResult};
use json_store::{read_state_from_json, read_state_from_json_result, write_state_to_json};
use migrations::{migrate_loaded_state, with_migration_warning};
use paths::{json_state_backup_path, json_state_path, sqlite_state_path};
pub use recovery::{recover_state_from_input_path, RecoverySummary};
use sqlite_store::{read_state_from_sqlite, write_state_to_sqlite};
pub(crate) use types::LoadResult;
use types::{
    path_string, SOURCE_FRESH, WARNING_MIGRATED_JSON_TO_SQLITE, WARNING_STATE_RESET_FRESH,
};

/// Serializes every read-modify-write of persisted state across Tauri commands.
static STATE_WRITE_LOCK: Mutex<()> = Mutex::new(());

/// Runs `operation` while holding the process-wide state write lock. Callers must not
/// nest this call, because the lock is not reentrant.
pub fn with_state_write_lock<T>(
    operation: impl FnOnce() -> Result<T, String>,
) -> Result<T, String> {
    let _guard = STATE_WRITE_LOCK.lock().map_err(|_| {
        "Saved state lock was poisoned by an earlier failure. Restart Bartleby.".to_string()
    })?;
    operation()
}

/// Loads the canonical application state, including legacy-directory migration.
pub fn load_app_state(app: &AppHandle) -> Result<LoadResult, String> {
    let canonical_directory = app_paths::canonical_data_directory(app)?;
    legacy::load_preferred_state(
        &canonical_directory,
        &app_paths::legacy_desktop_data_directories(),
    )
}

pub fn save_state_to_directory(data_directory: &Path, state: &Value) -> Result<Value, String> {
    let warning_message = persist_state_to_directory(data_directory, state)?;
    Ok(save_result_value(warning_message))
}

pub(crate) fn load_state_value_from_directory(data_directory: &Path) -> Value {
    load_canonical_state(data_directory).state
}

pub(crate) fn load_imported_state_value_from_directory(
    data_directory: &Path,
) -> Result<Value, String> {
    let load_result = imported_state_result(data_directory)?;
    if !has_bootstrap_state(&load_result.state) {
        return Err("Imported planner state is missing books or settings.".to_string());
    }
    Ok(load_result.state)
}

pub(super) fn decorate_primary_json_migration(load_result: LoadResult) -> LoadResult {
    if load_result.source != types::SOURCE_JSON_PRIMARY {
        return load_result;
    }
    LoadResult {
        warning_code: Some(WARNING_MIGRATED_JSON_TO_SQLITE),
        warning_message: Some("Migrated saved data from JSON storage to SQLite.".to_string()),
        ..load_result
    }
}

pub(super) fn fresh_state_result(data_directory: &Path) -> LoadResult {
    LoadResult {
        source: SOURCE_FRESH,
        source_path: path_string(data_directory),
        state: Value::Null,
        warning_code: None,
        warning_message: None,
    }
}

/// True when any workspace (or a version 1 snapshot) can boot the renderer.
pub(super) fn has_bootstrap_state(state: &Value) -> bool {
    workspace_model::snapshots(state)
        .into_iter()
        .any(workspace_model::snapshot_has_bootstrap_shape)
}

fn has_persisted_artifacts(data_directory: &Path) -> bool {
    fs::exists(sqlite_state_path(data_directory)).unwrap_or(false)
        || fs::exists(json_state_path(data_directory)).unwrap_or(false)
        || fs::exists(json_state_backup_path(data_directory)).unwrap_or(false)
}

pub(super) fn legacy_migration_message(error: &str) -> String {
    format!("Loaded legacy saved data but could not migrate it to Tauri storage: {error}")
}

pub(crate) fn load_canonical_state(data_directory: &Path) -> LoadResult {
    if let Some(load_result) = preferred_state_result_in_place(data_directory) {
        return load_result;
    }
    if has_persisted_artifacts(data_directory) {
        return reset_fresh_state_result(data_directory);
    }
    fresh_state_result(data_directory)
}

pub(crate) fn persist_state_to_directory(
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

fn imported_state_result(data_directory: &Path) -> Result<LoadResult, String> {
    let load_result = read_state_from_json_result(data_directory)?
        .ok_or_else(|| "Imported data archive did not contain planner_state.json.".to_string())?;
    let load_result = decorate_primary_json_migration(load_result);
    migrate_imported_state_result(data_directory, load_result)
}

fn migrate_imported_state_result(
    data_directory: &Path,
    load_result: LoadResult,
) -> Result<LoadResult, String> {
    let Some(migration) = migrate_loaded_state(&load_result.state)? else {
        return Ok(load_result);
    };
    if migration.replaces_legacy_snapshot {
        pre_workspace_backup::write_backup(data_directory, &load_result.state)?;
    }
    let migrated_result = load_result.with_state(migration.migrated_state);
    if !migration.should_rewrite {
        return Ok(migrated_result);
    }
    persist_state_to_directory(data_directory, &migrated_result.state)?;
    Ok(with_migration_warning(migrated_result))
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

/// Migrates loaded state in place. Data that cannot be migrated safely is never
/// replaced by fresh state: the result blocks writes so a later save cannot overwrite it.
fn rewrite_migrated_state_in_place(
    data_directory: &Path,
    load_result: LoadResult,
) -> Option<LoadResult> {
    let migration = match migrate_loaded_state(&load_result.state) {
        Ok(Some(migration)) => migration,
        Ok(None) => return Some(load_result),
        Err(error) => return Some(blocked_state_result(data_directory, error)),
    };
    if let Err(error) = backup_before_rewrite(data_directory, &load_result.state, &migration) {
        return Some(blocked_state_result(data_directory, error));
    }
    let migrated_result = load_result.with_state(migration.migrated_state);
    if !migration.should_rewrite {
        return Some(migrated_result);
    }
    if let Err(error) = persist_state_to_directory(data_directory, &migrated_result.state) {
        return Some(migrated_result.with_warning_message(format!(
            "Loaded saved data but could not store its migration yet: {error}"
        )));
    }
    Some(with_migration_warning(migrated_result))
}

fn backup_before_rewrite(
    data_directory: &Path,
    legacy_state: &Value,
    migration: &migrations::MigrationResult,
) -> Result<(), String> {
    if !migration.replaces_legacy_snapshot {
        return Ok(());
    }
    pre_workspace_backup::write_backup(data_directory, legacy_state)
}

fn blocked_state_result(data_directory: &Path, error: String) -> LoadResult {
    LoadResult {
        warning_code: Some(types::WARNING_STATE_WRITE_BLOCKED),
        warning_message: Some(format!(
            "Saved data was left untouched and changes will not be saved: {error}"
        )),
        ..fresh_state_result(data_directory)
    }
}

/// Loads canonical state for a write, refusing when saved data must not be replaced.
pub(crate) fn load_canonical_state_for_write(data_directory: &Path) -> Result<Value, String> {
    let load_result = load_canonical_state(data_directory);
    if load_result.warning_code == Some(types::WARNING_STATE_WRITE_BLOCKED) {
        return Err(load_result.warning_message.unwrap_or_default());
    }
    Ok(load_result.state)
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
    legacy::load_legacy_state(canonical_directory, legacy_directory)
}

#[cfg(test)]
pub fn load_preferred_state_for_test(
    canonical_directory: &Path,
    legacy_directories: &[std::path::PathBuf],
) -> Result<LoadResult, String> {
    legacy::load_preferred_state(canonical_directory, legacy_directories)
}

fn bootstrap_state_result(load_result: &Option<LoadResult>) -> Option<LoadResult> {
    let load_result = load_result.clone()?;
    if has_bootstrap_state(&load_result.state) {
        return Some(load_result);
    }
    None
}
