//! Create, rename, archive, restore, delete, and activate workspaces.
//!
//! Every function mutates an in-memory envelope; callers persist it in one journal
//! transaction, so a failed operation leaves saved state untouched.
use serde_json::{json, Value};
use uuid::Uuid;

use super::requests::{
    CreateRequest, DeleteRequest, DependencyPolicy, ShelfPolicy, TransferRequest,
};
use super::{snapshot_of, transfer};
use crate::workspace_model::{self, KEY_ACTIVE_WORKSPACE_ID, KEY_ARCHIVED, KEY_NAME, KEY_SNAPSHOT};

/// Planner settings and workspace preferences for a new workspace.
type StartingPlan = (Value, Value);

const MAX_WORKSPACE_NAME_CHARS: usize = 80;
const PLANNER_SNAPSHOT_VERSION: i64 = 1;
const WORKSPACE_ID_PREFIX: &str = "workspace-";

/// Adds an empty workspace and returns its new immutable id.
pub fn create(
    state: &mut Value,
    request: &CreateRequest,
    default_settings: &Value,
) -> Result<String, String> {
    let name = validated_name(state, &request.name, None)?;
    let (settings, preferences) = starting_plan(state, request, default_settings)?;
    let id = format!("{WORKSPACE_ID_PREFIX}{}", Uuid::new_v4());
    let mut entry = workspace_model::new_workspace_entry(&id, &name);
    entry[KEY_SNAPSHOT] = json!({
        "blocked_day_books": {},
        "books": [],
        "last_result": null,
        "preferences": preferences,
        "schedule_completions": {},
        "sessions": [],
        "settings": settings,
        "state_version": PLANNER_SNAPSHOT_VERSION,
    });
    workspaces_of(state)?.push(entry);
    Ok(id)
}

/// Copies planner settings, never books or history.
fn starting_plan(
    state: &Value,
    request: &CreateRequest,
    default_settings: &Value,
) -> Result<StartingPlan, String> {
    let Some(source_id) = request.inherit_settings_from.as_deref() else {
        return Ok((default_settings.clone(), json!({})));
    };
    let snapshot = snapshot_of(state, source_id)?;
    let settings = snapshot
        .get("settings")
        .cloned()
        .unwrap_or_else(|| default_settings.clone());
    Ok((settings, json!({})))
}

pub fn rename(state: &mut Value, workspace_id: &str, name: &str) -> Result<(), String> {
    let name = validated_name(state, name, Some(workspace_id))?;
    entry_mut(state, workspace_id)?[KEY_NAME] = Value::String(name);
    Ok(())
}

/// Archives or restores a workspace; at least one workspace always stays usable.
pub fn set_archived(state: &mut Value, workspace_id: &str, archived: bool) -> Result<(), String> {
    let entry = entry_mut(state, workspace_id)?;
    if workspace_model::is_archived(entry) == archived {
        return Ok(());
    }
    if archived && workspace_model::usable_workspace_count(state) <= 1 {
        return Err("Keep at least one workspace that is not archived.".to_string());
    }
    entry_mut(state, workspace_id)?[KEY_ARCHIVED] = json!(archived);
    repair_active_after_removal(state, workspace_id, None);
    Ok(())
}

/// Deletes a workspace, optionally moving all of its books to another workspace first.
pub fn delete(state: &mut Value, request: &DeleteRequest) -> Result<(), String> {
    let entry = entry_mut(state, &request.workspace_id)?;
    let is_usable = !workspace_model::is_archived(entry);
    if is_usable && workspace_model::usable_workspace_count(state) <= 1 {
        return Err("Bartleby needs at least one workspace that is not archived. Create another workspace before deleting this one.".to_string());
    }
    if let Some(target_id) = request.transfer_books_to.as_deref() {
        move_all_books(state, request, target_id)?;
    }
    workspaces_of(state)?.retain(|entry| {
        workspace_model::workspace_id(entry) != Some(request.workspace_id.as_str())
    });
    repair_active_after_removal(
        state,
        &request.workspace_id,
        request.transfer_books_to.as_deref(),
    );
    Ok(())
}

fn move_all_books(
    state: &mut Value,
    request: &DeleteRequest,
    target_id: &str,
) -> Result<(), String> {
    let book_ids = transfer::book_ids(snapshot_of(state, &request.workspace_id)?);
    if book_ids.is_empty() {
        return Ok(());
    }
    let transfer_request = TransferRequest {
        book_ids,
        dependency_policy: DependencyPolicy::Remove,
        restore_books: None,
        shelf_policy: ShelfPolicy::Keep,
        source_workspace_id: request.workspace_id.clone(),
        target_workspace_id: target_id.to_string(),
        today: request.today.clone(),
    };
    transfer::transfer_books(state, &transfer_request).map(|_| ())
}

/// Makes a usable workspace the one restored on next launch.
pub fn activate(state: &mut Value, workspace_id: &str) -> Result<(), String> {
    if workspace_model::is_archived(entry_mut(state, workspace_id)?) {
        return Err("Restore this workspace before opening it.".to_string());
    }
    state[KEY_ACTIVE_WORKSPACE_ID] = Value::String(workspace_id.to_string());
    Ok(())
}

/// Moves the active selection off a workspace that just became unusable.
fn repair_active_after_removal(state: &mut Value, removed_id: &str, preferred_id: Option<&str>) {
    if workspace_model::active_workspace_id(state) != Some(removed_id) {
        return;
    }
    let preferred_is_usable = preferred_id
        .and_then(|id| workspace_model::find_workspace(state, id))
        .is_some_and(|entry| !workspace_model::is_archived(entry));
    let next_id = match preferred_is_usable {
        true => preferred_id.map(str::to_string),
        false => workspace_model::first_usable_workspace_id(state),
    };
    state[KEY_ACTIVE_WORKSPACE_ID] = Value::String(next_id.unwrap_or_default());
}

fn validated_name(state: &Value, name: &str, own_id: Option<&str>) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err("Enter a workspace name.".to_string());
    }
    if trimmed.chars().count() > MAX_WORKSPACE_NAME_CHARS {
        return Err(format!(
            "Workspace names can be at most {MAX_WORKSPACE_NAME_CHARS} characters."
        ));
    }
    if name_is_taken(state, trimmed, own_id) {
        return Err(format!("A workspace named \"{trimmed}\" already exists."));
    }
    Ok(trimmed.to_string())
}

fn name_is_taken(state: &Value, name: &str, own_id: Option<&str>) -> bool {
    let normalized = name.to_lowercase();
    workspace_model::workspaces(state).iter().any(|entry| {
        workspace_model::workspace_id(entry) != own_id
            && entry
                .get(KEY_NAME)
                .and_then(Value::as_str)
                .is_some_and(|other| other.trim().to_lowercase() == normalized)
    })
}

fn entry_mut<'a>(state: &'a mut Value, workspace_id: &str) -> Result<&'a mut Value, String> {
    workspace_model::find_workspace_mut(state, workspace_id)
        .ok_or_else(|| format!("Workspace {workspace_id} does not exist."))
}

fn workspaces_of(state: &mut Value) -> Result<&mut Vec<Value>, String> {
    workspace_model::workspaces_mut(state)
        .ok_or_else(|| "Saved state is missing its workspace list.".to_string())
}
