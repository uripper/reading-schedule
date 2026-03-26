use serde_json::Value;

use super::types::{LoadResult, WARNING_MIGRATED_STATE_VERSION};

const CURRENT_STATE_VERSION: i64 = 1;
const LEGACY_STATE_VERSION: i64 = 0;
const MIGRATION_MESSAGE: &str = "Migrated saved data to the current state snapshot version.";

pub struct MigrationResult {
    pub migrated_state: Value,
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
    if version == CURRENT_STATE_VERSION {
        return Ok(Some(MigrationResult {
            migrated_state: state.clone(),
            should_rewrite: false,
        }));
    }
    if version == LEGACY_STATE_VERSION {
        let mut migrated_state = state_object.clone();
        migrated_state.insert(
            "state_version".to_string(),
            Value::Number(CURRENT_STATE_VERSION.into()),
        );
        return Ok(Some(MigrationResult {
            migrated_state: Value::Object(migrated_state),
            should_rewrite: true,
        }));
    }
    Err(format!(
        "Unsupported saved state version: {version}. Try updating the app or resetting the saved planner state."
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
