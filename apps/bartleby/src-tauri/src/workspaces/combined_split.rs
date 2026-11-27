//! Routes a merged All Workspaces save back into each workspace atomically.
//!
//! The merged snapshot is the full truth for usable workspaces: records missing from it
//! were deleted. Each workspace keeps its own settings, daily goal, and planner summary;
//! application-level preferences are lifted as in any save. Only workspaces whose
//! snapshot actually changed get a new revision.
use std::collections::HashMap;

use serde_json::{json, Map, Value};

use super::combined::{array, stored_snapshot, usable_entries};
use super::combined_owners::{build_owners, Owners};
use super::requests::SaveRequest;
use crate::workspace_model::{self, KEY_SNAPSHOT};

const KEY_BOOK_WORKSPACES: &str = "book_workspaces";

/// Revision of each workspace after a save.
pub type WorkspaceRevisions = HashMap<String, u64>;

/// The merged snapshot being saved and the owner of each of its records.
struct MergedSave<'a> {
    merged: &'a Value,
    owners: &'a Owners,
}

/// Applies the merged save and returns the revision of every usable workspace.
pub fn apply_combined_save(
    state: &mut Value,
    request: &SaveRequest,
) -> Result<WorkspaceRevisions, String> {
    if !workspace_model::is_all_workspaces_view(state) {
        return Err("All Workspaces is no longer open, so these changes were not saved. Reopen it and try again.".to_string());
    }
    check_revisions(state, request.expected_revisions.as_ref())?;
    let owners = build_owners(state, &request.state)?;
    let save = MergedSave {
        merged: &request.state,
        owners: &owners,
    };
    let ids: Vec<String> = usable_entries(state)
        .iter()
        .filter_map(|entry| workspace_model::workspace_id(entry).map(str::to_string))
        .collect();
    for id in &ids {
        store_split(state, id, &save)?;
    }
    Ok(revisions(state))
}

fn check_revisions(state: &Value, expected: Option<&HashMap<String, u64>>) -> Result<(), String> {
    let Some(expected) = expected else {
        return Ok(());
    };
    let stale = usable_entries(state).into_iter().find(|entry| {
        let id = workspace_model::workspace_id(entry).unwrap_or_default();
        expected.get(id).copied().unwrap_or_default() != workspace_model::revision(entry)
    });
    match stale {
        None => Ok(()),
        Some(_) => Err(format!(
            "{}: A workspace changed after All Workspaces was loaded. Reload it before saving again.",
            super::save::STALE_REVISION_PREFIX
        )),
    }
}

/// Stores one workspace's share of the merged snapshot when it differs.
fn store_split(state: &mut Value, id: &str, save: &MergedSave<'_>) -> Result<(), String> {
    let entry = workspace_model::find_workspace(state, id)
        .ok_or_else(|| format!("Workspace {id} does not exist."))?;
    let previous = stored_snapshot(entry);
    let next = split_snapshot(&previous, id, save);
    workspace_model::store_snapshot(state, id, &next)?;
    let entry = workspace_model::find_workspace_mut(state, id)
        .ok_or_else(|| format!("Workspace {id} does not exist."))?;
    if entry.get(KEY_SNAPSHOT) != Some(&previous) {
        workspace_model::bump_revision(entry);
    }
    Ok(())
}

fn split_snapshot(previous: &Value, id: &str, save: &MergedSave<'_>) -> Value {
    let merged = save.merged;
    let owners = save.owners;
    let owned = |owner: Option<String>| owner.as_deref() == Some(id);
    let mut next = previous.clone();
    next["books"] = Value::Array(
        array(merged, "books")
            .into_iter()
            .filter(|book| {
                owned(
                    book.get("book_id")
                        .and_then(Value::as_str)
                        .and_then(|book_id| owners.book(book_id))
                        .cloned(),
                )
            })
            .collect(),
    );
    next["sessions"] = Value::Array(
        array(merged, "sessions")
            .into_iter()
            .filter(|session| owned(owners.session(session)))
            .collect(),
    );
    next["schedule_completions"] = filtered(merged, "schedule_completions", |key| {
        owned(owners.completion(key))
    });
    next["blocked_day_books"] = filtered(merged, "blocked_day_books", |key| {
        owned(owners.blocked(key))
    });
    let rows: Vec<Value> = array(
        merged.get("last_result").unwrap_or(&Value::Null),
        "schedule",
    )
    .into_iter()
    .filter(|row| owned(owners.row(row)))
    .collect();
    next["last_result"] = split_result(previous, merged, rows);
    next["preferences"] = merged
        .get("preferences")
        .cloned()
        .unwrap_or_else(|| json!({}));
    if let Some(next_object) = next.as_object_mut() {
        next_object.remove(KEY_BOOK_WORKSPACES);
    }
    next
}

fn filtered(merged: &Value, key: &str, keep: impl Fn(&str) -> bool) -> Value {
    let object: Map<String, Value> = merged
        .get(key)
        .and_then(Value::as_object)
        .map(|entries| {
            entries
                .iter()
                .filter(|(entry_key, _)| keep(entry_key))
                .map(|(entry_key, value)| (entry_key.clone(), value.clone()))
                .collect()
        })
        .unwrap_or_default();
    Value::Object(object)
}

/// Keeps the workspace's own planner summary; a changed schedule takes the merged time.
fn split_result(previous: &Value, merged: &Value, rows: Vec<Value>) -> Value {
    let previous_result = previous
        .get("last_result")
        .filter(|result| result.is_object());
    let previous_rows = previous_result
        .map(|result| array(result, "schedule"))
        .unwrap_or_default();
    if rows.is_empty() && previous_result.is_none() {
        return Value::Null;
    }
    let mut created_at = previous_result
        .and_then(|result| result.get("created_at"))
        .cloned();
    if rows != previous_rows {
        created_at = merged.pointer("/last_result/created_at").cloned();
    }
    let summary = previous_result
        .and_then(|result| result.get("summary"))
        .cloned();
    json!({
        "created_at": created_at.unwrap_or(Value::Null),
        "schedule": rows,
        "summary": summary.unwrap_or(Value::Null),
    })
}

fn revisions(state: &Value) -> WorkspaceRevisions {
    usable_entries(state)
        .into_iter()
        .filter_map(|entry| {
            workspace_model::workspace_id(entry)
                .map(|id| (id.to_string(), workspace_model::revision(entry)))
        })
        .collect()
}
