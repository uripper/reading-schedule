//! Builds and validates the version 2 application envelope.
use std::collections::HashSet;

use chrono::Utc;
use serde_json::{json, Map, Value};

use super::{
    is_app_state, is_archived, store_snapshot, workspace_id, workspaces, workspaces_mut,
    APP_STATE_VERSION, DEFAULT_WORKSPACE_ID, DEFAULT_WORKSPACE_NAME, KEY_ACTIVE_WORKSPACE_ID,
    KEY_APP_PREFERENCES, KEY_ARCHIVED, KEY_CREATED_AT, KEY_FEATURE_FLAGS, KEY_NAME, KEY_REVISION,
    KEY_SNAPSHOT, KEY_STATE_VERSION, KEY_WORKSPACES,
};

const PLANNER_SNAPSHOT_VERSION: i64 = 1;

/// Wraps a version 0 or 1 planner snapshot into a single default workspace.
pub fn migrate_to_app_state(planner_snapshot: &Value) -> Result<Value, String> {
    let mut snapshot = planner_snapshot.clone();
    snapshot[KEY_STATE_VERSION] = json!(PLANNER_SNAPSHOT_VERSION);
    let mut app_state = json!({
        KEY_STATE_VERSION: APP_STATE_VERSION,
        KEY_ACTIVE_WORKSPACE_ID: DEFAULT_WORKSPACE_ID,
        KEY_APP_PREFERENCES: {},
        KEY_FEATURE_FLAGS: {},
        KEY_WORKSPACES: [new_workspace_entry(DEFAULT_WORKSPACE_ID, DEFAULT_WORKSPACE_NAME)],
    });
    store_snapshot(&mut app_state, DEFAULT_WORKSPACE_ID, &snapshot)?;
    Ok(app_state)
}

/// Returns an envelope for any supported state shape.
pub fn ensure_app_state(state: &Value) -> Result<Value, String> {
    if is_app_state(state) {
        return validate_app_state(state);
    }
    let version = state
        .get(KEY_STATE_VERSION)
        .and_then(Value::as_i64)
        .unwrap_or(0);
    if version > PLANNER_SNAPSHOT_VERSION {
        return Err(format!(
            "Unsupported saved state version: {version}. Update Bartleby to open this data."
        ));
    }
    migrate_to_app_state(state)
}

/// Creates an empty workspace entry; callers store its snapshot separately.
pub fn new_workspace_entry(id: &str, name: &str) -> Value {
    json!({
        "id": id,
        KEY_NAME: name,
        KEY_ARCHIVED: false,
        KEY_CREATED_AT: Utc::now().to_rfc3339(),
        KEY_REVISION: 0,
        KEY_SNAPSHOT: {},
    })
}

/// Validates the envelope and repairs recoverable gaps such as a stale active id.
pub fn validate_app_state(state: &Value) -> Result<Value, String> {
    let mut next_state = state.clone();
    let entries = workspaces_mut(&mut next_state)
        .ok_or_else(|| "Saved state is missing its workspace list.".to_string())?;
    if entries.is_empty() {
        return Err(
            "Saved state has no workspaces. Restore a backup or reset the saved planner state."
                .to_string(),
        );
    }
    validate_entries(entries)?;
    ensure_usable_workspace(entries);
    repair_active_workspace(&mut next_state);
    ensure_object_key(&mut next_state, KEY_APP_PREFERENCES);
    ensure_object_key(&mut next_state, KEY_FEATURE_FLAGS);
    Ok(next_state)
}

fn validate_entries(entries: &mut [Value]) -> Result<(), String> {
    let mut seen_ids = HashSet::new();
    entries
        .iter_mut()
        .try_for_each(|entry| validate_entry(entry, &mut seen_ids))
}

fn validate_entry(entry: &mut Value, seen_ids: &mut HashSet<String>) -> Result<(), String> {
    let id = valid_entry_id(entry)?;
    if !seen_ids.insert(id.clone()) {
        return Err(format!("Saved state has a duplicate workspace id: {id}."));
    }
    normalize_entry(entry, &id)
}

fn valid_entry_id(entry: &Value) -> Result<String, String> {
    let id = workspace_id(entry).map(str::trim).unwrap_or_default();
    if id.is_empty() {
        return Err("Saved state has a workspace without an id.".to_string());
    }
    Ok(id.to_string())
}

fn normalize_entry(entry: &mut Value, id: &str) -> Result<(), String> {
    let Some(entry_object) = entry.as_object_mut() else {
        return Err(format!("Workspace {id} must be an object."));
    };
    if !entry_object.get(KEY_SNAPSHOT).is_some_and(Value::is_object) {
        return Err(format!("Workspace {id} is missing its planner snapshot."));
    }
    let name = entry_object
        .get(KEY_NAME)
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .unwrap_or(DEFAULT_WORKSPACE_NAME)
        .to_string();
    entry_object.insert(KEY_NAME.to_string(), Value::String(name));
    default_key(entry_object, KEY_ARCHIVED, json!(false));
    default_key(entry_object, KEY_REVISION, json!(0));
    default_key(entry_object, KEY_CREATED_AT, json!(Utc::now().to_rfc3339()));
    Ok(())
}

fn default_key(entry_object: &mut Map<String, Value>, key: &str, value: Value) {
    entry_object.entry(key.to_string()).or_insert(value);
}

/// Restores the first workspace when every workspace is archived.
fn ensure_usable_workspace(entries: &mut [Value]) {
    if entries.iter().any(|entry| !is_archived(entry)) {
        return;
    }
    if let Some(first_entry) = entries.first_mut() {
        first_entry[KEY_ARCHIVED] = json!(false);
    }
}

fn repair_active_workspace(state: &mut Value) {
    let active_id = state
        .get(KEY_ACTIVE_WORKSPACE_ID)
        .and_then(Value::as_str)
        .unwrap_or_default();
    let is_valid = workspaces(state)
        .iter()
        .any(|entry| workspace_id(entry) == Some(active_id) && !is_archived(entry));
    if is_valid {
        return;
    }
    let fallback_id = first_usable_workspace_id(state).unwrap_or_default();
    state[KEY_ACTIVE_WORKSPACE_ID] = Value::String(fallback_id);
}

/// Returns the first non-archived workspace id.
pub fn first_usable_workspace_id(state: &Value) -> Option<String> {
    workspaces(state)
        .iter()
        .find(|entry| !is_archived(entry))
        .and_then(workspace_id)
        .map(str::to_string)
}

fn ensure_object_key(state: &mut Value, key: &str) {
    if state.get(key).is_some_and(Value::is_object) {
        return;
    }
    state[key] = json!({});
}
