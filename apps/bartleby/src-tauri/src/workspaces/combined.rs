//! All Workspaces view: every usable workspace merged into one planner snapshot.
//!
//! The renderer applies the merged snapshot exactly like a single workspace, so every
//! tab shows all workspaces without view-specific code. Each record keeps belonging to
//! one workspace: `combined_split` routes a merged save back to the owners in one
//! transaction. Planner settings stay per workspace (`settings` per id). The view
//! shows the active workspace's settings and daily goal unchanged; nothing is summed.
use std::collections::HashMap;

use serde::Serialize;
use serde_json::{json, Map, Value};

use super::catalog::{catalog, WorkspaceLoad};
use crate::workspace_model::{self, ALL_WORKSPACES_ID, KEY_SNAPSHOT};

/// Ownership and per-workspace data the renderer needs in the All Workspaces view.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CombinedMeta {
    pub book_workspaces: HashMap<String, String>,
    pub revisions: HashMap<String, u64>,
    pub settings: HashMap<String, Value>,
}

/// Usable workspace entries in catalog order.
pub fn usable_entries(state: &Value) -> Vec<&Value> {
    workspace_model::workspaces(state)
        .iter()
        .filter(|entry| !workspace_model::is_archived(entry))
        .collect()
}

fn entry_id(entry: &Value) -> String {
    workspace_model::workspace_id(entry)
        .unwrap_or_default()
        .to_string()
}

/// Builds the payload the renderer applies when it opens All Workspaces.
pub fn combined_load(state: &Value) -> WorkspaceLoad {
    let entries = usable_entries(state);
    let projected: Vec<Value> = entries
        .iter()
        .map(|entry| workspace_model::project_snapshot(state, entry))
        .collect();
    WorkspaceLoad {
        catalog: catalog(state),
        combined: Some(combined_meta(&entries, &projected)),
        needs_replan: entries
            .iter()
            .any(|entry| workspace_model::needs_replan(entry)),
        revision: 0,
        state: merged_snapshot(state, &projected),
        workspace_id: ALL_WORKSPACES_ID.to_string(),
    }
}

fn combined_meta(entries: &[&Value], projected: &[Value]) -> CombinedMeta {
    let mut meta = CombinedMeta {
        book_workspaces: HashMap::new(),
        revisions: HashMap::new(),
        settings: HashMap::new(),
    };
    for (entry, snapshot) in entries.iter().zip(projected) {
        append_workspace_meta(&mut meta, entry, snapshot);
    }
    meta
}

fn append_workspace_meta(meta: &mut CombinedMeta, entry: &Value, snapshot: &Value) {
    let id = entry_id(entry);
    for book_id in book_ids(snapshot) {
        meta.book_workspaces.insert(book_id, id.clone());
    }
    meta.revisions
        .insert(id.clone(), workspace_model::revision(entry));
    meta.settings
        .insert(id, snapshot.get("settings").cloned().unwrap_or(Value::Null));
}

fn book_ids(snapshot: &Value) -> Vec<String> {
    array(snapshot, "books")
        .iter()
        .filter_map(|book| book.get("book_id").and_then(Value::as_str))
        .map(str::to_string)
        .collect()
}

/// Merges records of every workspace; the active workspace provides display settings.
fn merged_snapshot(state: &Value, projected: &[Value]) -> Value {
    let active_id = workspace_model::active_workspace_id(state).unwrap_or_default();
    let display = workspace_model::find_workspace(state, active_id)
        .map(|entry| workspace_model::project_snapshot(state, entry))
        .or_else(|| projected.first().cloned())
        .unwrap_or_else(|| json!({}));
    let preferences = display
        .get("preferences")
        .cloned()
        .unwrap_or_else(|| json!({}));
    json!({
        "blocked_day_books": merged_object(projected, "blocked_day_books"),
        "books": concat(projected, |snapshot| array(snapshot, "books")),
        "feature_flags": display.get("feature_flags").cloned().unwrap_or_else(|| json!({})),
        "last_result": merged_result(projected),
        "preferences": preferences,
        "schedule_completions": merged_object(projected, "schedule_completions"),
        "sessions": concat(projected, |snapshot| array(snapshot, "sessions")),
        "settings": display.get("settings").cloned().unwrap_or_else(|| json!({})),
        "state_version": 1,
    })
}

/// Concatenates schedules; the oldest plan time marks the merged schedule stale first.
fn merged_result(projected: &[Value]) -> Value {
    let results: Vec<&Value> = projected
        .iter()
        .filter_map(|snapshot| snapshot.get("last_result"))
        .filter(|result| result.is_object())
        .collect();
    if results.is_empty() {
        return Value::Null;
    }
    let created_at = results
        .iter()
        .filter_map(|result| result.get("created_at").and_then(Value::as_str))
        .min()
        .unwrap_or_default();
    let rows: Vec<Value> = results
        .iter()
        .flat_map(|result| array(result, "schedule"))
        .collect();
    json!({ "created_at": created_at, "schedule": rows, "summary": null })
}

fn concat(projected: &[Value], items: impl Fn(&Value) -> Vec<Value>) -> Vec<Value> {
    projected.iter().flat_map(items).collect()
}

fn merged_object(projected: &[Value], key: &str) -> Map<String, Value> {
    projected
        .iter()
        .filter_map(|snapshot| snapshot.get(key).and_then(Value::as_object))
        .flat_map(|object| object.clone())
        .collect()
}

/// Returns a copy of an array field, or an empty list.
pub fn array(value: &Value, key: &str) -> Vec<Value> {
    value
        .get(key)
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
}

/// Returns the stored snapshot of a workspace entry.
pub fn stored_snapshot(entry: &Value) -> Value {
    entry
        .get(KEY_SNAPSHOT)
        .cloned()
        .unwrap_or_else(|| json!({}))
}
