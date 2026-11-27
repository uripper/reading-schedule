//! Keeps a copy of single-library state before it is wrapped into workspaces.
//!
//! The workspace migration rewrites the snapshot row and the JSON compatibility copy,
//! and the journal only retains a few rows, so the pre-migration state would otherwise
//! be unrecoverable after a handful of saves. The backup is written once and never
//! overwritten, so repeated or interrupted migrations keep the oldest original.
use std::fs;
use std::path::Path;

use serde_json::Value;

use super::paths::pre_workspace_backup_path;

pub fn write_backup(data_directory: &Path, legacy_state: &Value) -> Result<(), String> {
    let backup_path = pre_workspace_backup_path(data_directory);
    if backup_path.exists() {
        return Ok(());
    }
    fs::create_dir_all(data_directory)
        .map_err(|error| format!("Unable to create app data directory for backup: {error}"))?;
    let payload = serde_json::to_vec_pretty(legacy_state)
        .map_err(|error| format!("Unable to encode pre-workspace backup: {error}"))?;
    fs::write(&backup_path, payload)
        .map_err(|error| format!("Unable to write pre-workspace backup: {error}"))
}
