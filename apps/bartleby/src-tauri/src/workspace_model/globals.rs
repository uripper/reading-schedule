//! Splits application-level preferences from workspace planner snapshots.
//!
//! The renderer keeps exchanging complete version 1 planner snapshots. On save the
//! native layer moves application-level preferences and feature flags into the
//! envelope; on load it merges them back. Every preference is application-level,
//! including the daily goal: one goal covers all workspaces. Preferences still found
//! in a workspace snapshot (saved by earlier builds) never override the app values.
use serde_json::{json, Map, Value};

use super::{find_workspace_mut, KEY_APP_PREFERENCES, KEY_FEATURE_FLAGS, KEY_SNAPSHOT};

const KEY_PREFERENCES: &str = "preferences";
const KEY_WORKSPACE_ID: &str = "workspace_id";

/// Returns the workspace snapshot merged with application-level preferences.
pub fn project_snapshot(state: &Value, entry: &Value) -> Value {
    let mut snapshot = entry
        .get(KEY_SNAPSHOT)
        .cloned()
        .unwrap_or_else(|| json!({}));
    let mut preferences = object_or_empty(snapshot.get(KEY_PREFERENCES));
    preferences.extend(object_or_empty(state.get(KEY_APP_PREFERENCES)));
    snapshot[KEY_PREFERENCES] = Value::Object(preferences);
    if let Some(feature_flags) = non_empty_object(state.get(KEY_FEATURE_FLAGS)) {
        snapshot[KEY_FEATURE_FLAGS] = feature_flags;
    }
    snapshot
}

/// Stores a renderer snapshot into the workspace, lifting application-level values.
pub fn store_snapshot(
    state: &mut Value,
    workspace_id: &str,
    snapshot: &Value,
) -> Result<(), String> {
    if !snapshot.is_object() {
        return Err("Workspace snapshot must be an object.".to_string());
    }
    let mut stored_snapshot = snapshot.clone();
    lift_app_preferences(state, &mut stored_snapshot);
    lift_feature_flags(state, &mut stored_snapshot);
    if let Some(stored_object) = stored_snapshot.as_object_mut() {
        stored_object.remove(KEY_WORKSPACE_ID);
    }
    let entry = find_workspace_mut(state, workspace_id)
        .ok_or_else(|| format!("Workspace {workspace_id} does not exist."))?;
    entry[KEY_SNAPSHOT] = stored_snapshot;
    Ok(())
}

fn lift_app_preferences(state: &mut Value, snapshot: &mut Value) {
    let Some(preferences) = snapshot.get(KEY_PREFERENCES).and_then(Value::as_object) else {
        return;
    };
    let mut app_preferences = object_or_empty(state.get(KEY_APP_PREFERENCES));
    app_preferences.extend(preferences.clone());
    state[KEY_APP_PREFERENCES] = Value::Object(app_preferences);
    snapshot[KEY_PREFERENCES] = json!({});
}

fn lift_feature_flags(state: &mut Value, snapshot: &mut Value) {
    let Some(snapshot_object) = snapshot.as_object_mut() else {
        return;
    };
    let Some(feature_flags) = snapshot_object.remove(KEY_FEATURE_FLAGS) else {
        return;
    };
    if feature_flags.is_object() {
        state[KEY_FEATURE_FLAGS] = feature_flags;
    }
}

fn object_or_empty(value: Option<&Value>) -> Map<String, Value> {
    value
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default()
}

fn non_empty_object(value: Option<&Value>) -> Option<Value> {
    let object = value.and_then(Value::as_object)?;
    if object.is_empty() {
        return None;
    }
    Some(Value::Object(object.clone()))
}
