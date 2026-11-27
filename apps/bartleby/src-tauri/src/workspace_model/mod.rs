//! Application-level state envelope (`state_version` 2) and its workspace entries.
//!
//! Architecture decision: Bartleby keeps its single versioned SQLite snapshot row and
//! journal. Version 2 nests one planner snapshot per workspace inside that row instead
//! of adding per-workspace rows or normalized tables. One row keeps workspace creation,
//! deletion, and book transfers atomic through the existing journal transaction, so
//! recovery, archive export, and the JSON compatibility copy still treat the whole
//! application as one value. Each nested snapshot keeps the version 1 planner shape,
//! so the shared renderer and the native planner payloads are unchanged.
//!
//! Invariants:
//! - Workspace ids are immutable once created; names are freely editable.
//! - Each book id lives in exactly one workspace.
//! - `revision` increases on every write of a workspace snapshot, which lets the
//!   renderer detect and reject stale saves.
//! - Helpers that take a state accept either shape: a version 1 planner snapshot is
//!   treated as a single anonymous workspace, so maintenance code stays shape-agnostic.
mod envelope;
mod globals;

use serde_json::{json, Value};

pub use envelope::{
    ensure_app_state, first_usable_workspace_id, migrate_to_app_state, new_workspace_entry,
    validate_app_state,
};
pub use globals::{project_snapshot, store_snapshot};

pub const APP_STATE_VERSION: i64 = 2;
pub const DEFAULT_WORKSPACE_ID: &str = "workspace-default";
pub const DEFAULT_WORKSPACE_NAME: &str = "My Reading";
pub const KEY_ACTIVE_WORKSPACE_ID: &str = "active_workspace_id";
pub const KEY_APP_PREFERENCES: &str = "app_preferences";
pub const KEY_ARCHIVED: &str = "archived";
pub const KEY_CREATED_AT: &str = "created_at";
pub const KEY_FEATURE_FLAGS: &str = "feature_flags";
pub const KEY_ID: &str = "id";
pub const KEY_NAME: &str = "name";
/// Set when books moved in or out; cleared by the next renderer save of that workspace.
pub const KEY_NEEDS_REPLAN: &str = "needs_replan";
pub const KEY_REVISION: &str = "revision";
pub const KEY_SNAPSHOT: &str = "snapshot";
pub const KEY_STATE_VERSION: &str = "state_version";
pub const KEY_WORKSPACES: &str = "workspaces";

/// Returns true when the value is a version 2 application envelope.
pub fn is_app_state(state: &Value) -> bool {
    state.get(KEY_WORKSPACES).is_some_and(Value::is_array)
}

/// Lists workspace entries, or nothing for non-envelope values.
pub fn workspaces(state: &Value) -> &[Value] {
    state
        .get(KEY_WORKSPACES)
        .and_then(Value::as_array)
        .map_or(&[], Vec::as_slice)
}

pub fn workspaces_mut(state: &mut Value) -> Option<&mut Vec<Value>> {
    state.get_mut(KEY_WORKSPACES).and_then(Value::as_array_mut)
}

pub fn workspace_id(entry: &Value) -> Option<&str> {
    entry.get(KEY_ID).and_then(Value::as_str)
}

pub fn find_workspace<'a>(state: &'a Value, id: &str) -> Option<&'a Value> {
    workspaces(state)
        .iter()
        .find(|entry| workspace_id(entry) == Some(id))
}

pub fn find_workspace_mut<'a>(state: &'a mut Value, id: &str) -> Option<&'a mut Value> {
    workspaces_mut(state)?
        .iter_mut()
        .find(|entry| workspace_id(entry) == Some(id))
}

pub fn active_workspace_id(state: &Value) -> Option<&str> {
    state.get(KEY_ACTIVE_WORKSPACE_ID).and_then(Value::as_str)
}

pub fn is_archived(entry: &Value) -> bool {
    entry
        .get(KEY_ARCHIVED)
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

pub fn revision(entry: &Value) -> u64 {
    entry.get(KEY_REVISION).and_then(Value::as_u64).unwrap_or(0)
}

pub fn needs_replan(entry: &Value) -> bool {
    entry
        .get(KEY_NEEDS_REPLAN)
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

pub fn bump_revision(entry: &mut Value) {
    let next_revision = revision(entry) + 1;
    entry[KEY_REVISION] = json!(next_revision);
}

/// Counts workspaces that are not archived and can therefore be active.
pub fn usable_workspace_count(state: &Value) -> usize {
    workspaces(state)
        .iter()
        .filter(|entry| !is_archived(entry))
        .count()
}

/// Returns every planner snapshot; a version 1 snapshot yields itself.
pub fn snapshots(state: &Value) -> Vec<&Value> {
    if !is_app_state(state) {
        return vec![state];
    }
    workspaces(state)
        .iter()
        .filter_map(|entry| entry.get(KEY_SNAPSHOT))
        .collect()
}

/// Applies `update` to every planner snapshot and reports whether any changed.
pub fn for_each_snapshot_mut(
    state: &mut Value,
    mut update: impl FnMut(&mut Value) -> bool,
) -> bool {
    if !is_app_state(state) {
        return update(state);
    }
    workspaces_mut(state)
        .into_iter()
        .flatten()
        .filter_map(|entry| entry.get_mut(KEY_SNAPSHOT))
        // Every snapshot must be visited, so this counts instead of short-circuiting.
        .map(&mut update)
        .filter(|has_changed| *has_changed)
        .count()
        > 0
}

/// Replaces every planner snapshot with the fallible `transform` result.
pub fn map_snapshots(
    state: &Value,
    transform: impl Fn(&Value) -> Result<Value, String>,
) -> Result<Value, String> {
    if !is_app_state(state) {
        return transform(state);
    }
    let mut next_state = state.clone();
    workspaces_mut(&mut next_state)
        .into_iter()
        .flatten()
        .try_for_each(|entry| map_entry_snapshot(entry, &transform))?;
    Ok(next_state)
}

fn map_entry_snapshot(
    entry: &mut Value,
    transform: &impl Fn(&Value) -> Result<Value, String>,
) -> Result<(), String> {
    let Some(snapshot) = entry.get(KEY_SNAPSHOT) else {
        return Ok(());
    };
    entry[KEY_SNAPSHOT] = transform(snapshot)?;
    Ok(())
}

/// Builds a pseudo snapshot holding the books of every workspace, so cover cleanup
/// keeps any file that some workspace still references.
pub fn combined_books_state(state: &Value) -> Value {
    let books: Vec<Value> = snapshots(state)
        .into_iter()
        .filter_map(|snapshot| snapshot.get("books").and_then(Value::as_array))
        .flatten()
        .cloned()
        .collect();
    json!({ "books": books })
}

/// Returns true when the snapshot has the books and settings needed to boot the UI.
pub fn snapshot_has_bootstrap_shape(snapshot: &Value) -> bool {
    let Some(snapshot_object) = snapshot.as_object() else {
        return false;
    };
    snapshot_object.contains_key("books") && snapshot_object.contains_key("settings")
}
