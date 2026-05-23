use std::fs;
use std::path::{Path, PathBuf};

use super::json_store::read_state_from_json_result;
use super::migrations::{migrate_loaded_state, with_migration_warning, MigrationResult};
use super::paths::{
    json_state_backup_path, json_state_path, legacy_migration_marker_path, sqlite_state_path,
};
use super::sqlite_store::read_state_from_sqlite_read_only_result;
use super::types::{path_string, LoadResult, SOURCE_FRESH};
use super::{
    decorate_primary_json_migration, has_bootstrap_state, legacy_migration_message,
    load_canonical_state, persist_state_to_directory,
};

pub fn load_preferred_state(
    canonical_directory: &Path,
    legacy_directories: &[PathBuf],
) -> Result<LoadResult, String> {
    let canonical_result = load_canonical_state(canonical_directory);
    if migration_marker_exists(canonical_directory) {
        return Ok(canonical_result);
    }
    if canonical_result.source != SOURCE_FRESH {
        return Ok(with_migration_marker(canonical_result, canonical_directory));
    }
    let legacy_result = first_legacy_state(canonical_directory, legacy_directories);
    if let Some(load_result) = legacy_result.load_result {
        return Ok(load_result);
    }
    Ok(with_legacy_probe_message(
        canonical_result,
        legacy_directories,
        &legacy_result.failures,
    ))
}

#[cfg(test)]
pub fn load_legacy_state(
    canonical_directory: &Path,
    legacy_directory: &Path,
) -> Result<LoadResult, String> {
    let Some(load_result) = load_legacy_state_if_available(canonical_directory, legacy_directory)?
    else {
        return Ok(super::fresh_state_result(canonical_directory));
    };
    Ok(load_result)
}

fn first_legacy_state(
    canonical_directory: &Path,
    legacy_directories: &[PathBuf],
) -> LegacySearchResult {
    let mut failures = Vec::new();
    for legacy_directory in legacy_directories {
        match load_legacy_state_if_available(canonical_directory, legacy_directory) {
            Ok(Some(load_result)) => return legacy_search_result(failures, Some(load_result)),
            Ok(None) => continue,
            Err(error) => failures.push(format!(
                "Legacy state read failed for {}: {error}",
                path_string(legacy_directory)
            )),
        }
    }
    legacy_search_result(failures, None)
}

fn load_legacy_state_if_available(
    canonical_directory: &Path,
    legacy_directory: &Path,
) -> Result<Option<LoadResult>, String> {
    let Some(load_result) = readable_legacy_state(legacy_directory)? else {
        return Ok(None);
    };
    if !has_bootstrap_state(&load_result.state) {
        return Ok(Some(load_result));
    }
    let migrated_result = load_result.clone();
    match persist_state_to_directory(canonical_directory, &load_result.state) {
        Ok(None) => Ok(Some(with_migration_marker(
            migrated_result,
            canonical_directory,
        ))),
        Ok(Some(warning_message)) => Ok(Some(with_migration_marker(
            append_warning(migrated_result, warning_message),
            canonical_directory,
        ))),
        Err(error) => Ok(Some(append_warning(
            migrated_result,
            legacy_migration_message(&error),
        ))),
    }
}

fn migration_marker_exists(canonical_directory: &Path) -> bool {
    legacy_migration_marker_path(canonical_directory).is_file()
}

fn with_migration_marker(load_result: LoadResult, canonical_directory: &Path) -> LoadResult {
    if migration_marker_exists(canonical_directory) {
        return load_result;
    }
    match fs::write(legacy_migration_marker_path(canonical_directory), b"done\n") {
        Ok(()) => load_result,
        Err(error) => append_warning(
            load_result,
            format!("Loaded state but could not persist legacy migration marker: {error}"),
        ),
    }
}

fn readable_legacy_state(data_directory: &Path) -> Result<Option<LoadResult>, String> {
    if !has_persisted_artifacts(data_directory) {
        return Ok(None);
    }
    let sqlite_error = match read_legacy_sqlite_state(data_directory) {
        Ok(Some(load_result)) => return migrate_legacy_state(load_result),
        Ok(None) => None,
        Err(error) => Some(error),
    };
    read_legacy_json_state(data_directory, sqlite_error)
}

fn read_legacy_sqlite_state(data_directory: &Path) -> Result<Option<LoadResult>, String> {
    if !sqlite_state_path(data_directory).exists() {
        return Ok(None);
    }
    match read_state_from_sqlite_read_only_result(data_directory) {
        Ok(Some(load_result)) => Ok(Some(load_result)),
        Ok(None) => {
            Err("Legacy SQLite did not contain a readable snapshot or journal.".to_string())
        }
        Err(error) => Err(error),
    }
}

fn read_legacy_json_state(
    data_directory: &Path,
    sqlite_error: Option<String>,
) -> Result<Option<LoadResult>, String> {
    match read_state_from_json_result(data_directory) {
        Ok(Some(load_result)) => migrate_json_fallback(load_result, sqlite_error),
        Ok(None) => missing_legacy_json_result(sqlite_error),
        Err(json_error) => failed_legacy_json_result(sqlite_error, json_error),
    }
}

fn migrate_json_fallback(
    load_result: LoadResult,
    sqlite_error: Option<String>,
) -> Result<Option<LoadResult>, String> {
    let decorated_result = decorate_primary_json_migration(load_result);
    migrate_legacy_state(decorated_result).map(|result| {
        result.map(|load_result| match sqlite_error {
            Some(error) => append_warning(load_result, sqlite_fallback_message(&error)),
            None => load_result,
        })
    })
}

fn missing_legacy_json_result(sqlite_error: Option<String>) -> Result<Option<LoadResult>, String> {
    match sqlite_error {
        Some(error) => Err(format!(
            "Unable to read legacy SQLite state, and no JSON fallback was found: {error}"
        )),
        None => Ok(None),
    }
}

fn failed_legacy_json_result(
    sqlite_error: Option<String>,
    json_error: String,
) -> Result<Option<LoadResult>, String> {
    match sqlite_error {
        Some(error) => Err(format!(
            "Unable to read legacy SQLite state: {error} JSON fallback failed: {json_error}"
        )),
        None => Err(json_error),
    }
}

fn sqlite_fallback_message(sqlite_error: &str) -> String {
    format!("Legacy SQLite read failed; loaded JSON fallback: {sqlite_error}")
}

fn migrate_legacy_state(load_result: LoadResult) -> Result<Option<LoadResult>, String> {
    match migrate_loaded_state(&load_result.state) {
        Ok(Some(migration)) => Ok(Some(migrated_legacy_result(load_result, migration))),
        Ok(None) => Ok(Some(load_result)),
        Err(error) => Err(format!("Unable to migrate legacy state: {error}")),
    }
}

fn migrated_legacy_result(load_result: LoadResult, migration: MigrationResult) -> LoadResult {
    let migrated_result = load_result.with_state(migration.migrated_state);
    if !migration.should_rewrite {
        return migrated_result;
    }
    with_migration_warning(migrated_result)
}

fn append_warning(mut load_result: LoadResult, message: String) -> LoadResult {
    load_result.warning_message = Some(match load_result.warning_message {
        Some(existing) if !existing.is_empty() => format!("{existing} {message}"),
        _ => message,
    });
    load_result
}

struct LegacySearchResult {
    failures: Vec<String>,
    load_result: Option<LoadResult>,
}

fn legacy_search_result(
    failures: Vec<String>,
    load_result: Option<LoadResult>,
) -> LegacySearchResult {
    LegacySearchResult {
        failures,
        load_result,
    }
}

fn legacy_probe_message(legacy_directories: &[PathBuf], failures: &[String]) -> Option<String> {
    if legacy_directories.is_empty() {
        return None;
    }
    let paths = legacy_directories
        .iter()
        .map(|directory| legacy_probe_line(directory))
        .collect::<Vec<_>>()
        .join("; ");
    if failures.is_empty() {
        return Some(format!("Checked legacy state directories: {paths}"));
    }
    Some(format!(
        "Checked legacy state directories: {paths}. {}",
        failures.join(" ")
    ))
}

fn legacy_probe_line(data_directory: &Path) -> String {
    format!(
        "{} [sqlite: {}, json: {}, backup: {}]",
        path_string(data_directory),
        artifact_status(&sqlite_state_path(data_directory)),
        artifact_status(&json_state_path(data_directory)),
        artifact_status(&json_state_backup_path(data_directory))
    )
}

fn with_legacy_probe_message(
    load_result: LoadResult,
    legacy_directories: &[PathBuf],
    failures: &[String],
) -> LoadResult {
    if load_result.source != SOURCE_FRESH || load_result.warning_message.is_some() {
        return load_result;
    }
    match legacy_probe_message(legacy_directories, failures) {
        Some(message) => load_result.with_warning_message(message),
        None => load_result,
    }
}

fn has_persisted_artifacts(data_directory: &Path) -> bool {
    sqlite_state_path(data_directory).exists()
        || json_state_path(data_directory).exists()
        || json_state_backup_path(data_directory).exists()
}

fn artifact_status(path: &Path) -> &'static str {
    if path.is_file() {
        return "file";
    }
    if path.exists() {
        return "not-file";
    }
    "missing"
}
