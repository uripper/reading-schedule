//! Upgrades saved state to the version 2 application envelope.
use serde_json::Value;

use super::types::{LoadResult, WARNING_MIGRATED_STATE_VERSION};
use crate::workspace_model::{self, APP_STATE_VERSION};

const LEGACY_STATE_VERSION: i64 = 0;
const PLANNER_SNAPSHOT_VERSION: i64 = 1;
const MIGRATION_MESSAGE: &str = "Migrated saved data to the current state snapshot version.";

pub struct MigrationResult {
    pub migrated_state: Value,
    /// True when the source predates workspaces and must be backed up before rewriting.
    pub replaces_legacy_snapshot: bool,
    pub should_rewrite: bool,
}

pub fn migrate_loaded_state(state: &Value) -> Result<Option<MigrationResult>, String> {
    if state.is_null() {
        return Ok(None);
    }
    let Some(state_object) = state.as_object() else {
        return Err("Saved state must be an object.".to_string());
    };
    let version = state_version(state_object)?;
    if version == APP_STATE_VERSION {
        let migrated_state = workspace_model::validate_app_state(state)?;
        let should_rewrite = migrated_state != *state;
        return Ok(Some(MigrationResult {
            migrated_state,
            replaces_legacy_snapshot: false,
            should_rewrite,
        }));
    }
    if version == LEGACY_STATE_VERSION || version == PLANNER_SNAPSHOT_VERSION {
        return Ok(Some(MigrationResult {
            migrated_state: workspace_model::migrate_to_app_state(state)?,
            replaces_legacy_snapshot: true,
            should_rewrite: true,
        }));
    }
    Err(format!(
        "Unsupported saved state version: {version}. Update Bartleby to a version that supports it, or restore an older backup."
    ))
}

pub fn with_migration_warning(mut load_result: LoadResult) -> LoadResult {
    if load_result.warning_code.is_none() {
        load_result.warning_code = Some(WARNING_MIGRATED_STATE_VERSION);
    }
    load_result.warning_message = Some(match load_result.warning_message {
        Some(existing) if !existing.is_empty() => format!("{existing} {MIGRATION_MESSAGE}"),
        _ => MIGRATION_MESSAGE.to_string(),
    });
    load_result
}

fn state_version(state_object: &serde_json::Map<String, Value>) -> Result<i64, String> {
    let Some(version) = state_object.get("state_version") else {
        return Ok(LEGACY_STATE_VERSION);
    };
    let Some(version) = version.as_i64() else {
        return Err("Saved state version must be an integer.".to_string());
    };
    Ok(version)
}
