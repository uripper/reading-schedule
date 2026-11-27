//! Native authority for workspaces: independent reading and planning environments.
//!
//! The renderer holds exactly one workspace (the active one) in memory and exchanges
//! version 1 planner snapshots with these operations. Every operation takes the
//! process-wide state write lock, loads the canonical envelope, mutates a copy, and
//! persists it in one journal transaction, so creation, deletion, archival, and book
//! transfers are all-or-nothing. See `workspace_model` for the storage decision.
mod catalog;
mod combined;
mod combined_owners;
mod combined_split;
mod completion;
mod lifecycle;
mod requests;
mod save;
#[cfg(test)]
pub(crate) mod test_support;
#[cfg(test)]
mod tests;
#[cfg(test)]
mod tests_combined;
#[cfg(test)]
mod tests_save;
#[cfg(test)]
mod tests_transfer;
#[cfg(test)]
mod tests_transfer_dependencies;
mod transfer;
mod transfer_dependencies;
mod transfer_rows;

use std::path::Path;

use serde::Serialize;
use serde_json::{json, Value};

use crate::state_store::{self, LoadResult};
use crate::workspace_model;
pub use catalog::{WorkspaceCatalog, WorkspaceLoad, WorkspaceSnapshotEntry};
pub use requests::{CompletionRequest, CreateRequest, DeleteRequest, SaveRequest, TransferRequest};
pub use transfer::TransferOutcome;

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceCreated {
    pub catalog: WorkspaceCatalog,
    pub workspace_id: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferResult {
    pub catalog: WorkspaceCatalog,
    pub outcome: TransferOutcome,
}

/// Projects a startup load onto its active workspace and attaches the catalog.
pub fn project_active_load(load_result: LoadResult) -> Result<Value, String> {
    if load_result.state.is_null() {
        return Ok(load_result.into_value());
    }
    let state = workspace_model::ensure_app_state(&load_result.state)?;
    let active_id = workspace_model::active_workspace_id(&state)
        .unwrap_or_default()
        .to_string();
    let workspace = current_view_load(&state, &active_id)?;
    let mut payload = load_result.with_state(workspace.state).into_value();
    payload["workspace"] = json!({
        "catalog": workspace.catalog,
        "combined": workspace.combined,
        "needsReplan": workspace.needs_replan,
        "revision": workspace.revision,
        "workspaceId": workspace.workspace_id,
    });
    Ok(payload)
}

/// Loads the All Workspaces view when it is selected, otherwise the active workspace.
fn current_view_load(state: &Value, active_id: &str) -> Result<WorkspaceLoad, String> {
    if workspace_model::is_all_workspaces_view(state) {
        return Ok(combined::combined_load(state));
    }
    catalog::workspace_load(state, active_id)
}

/// Reads the All Workspaces view without changing the saved selection.
pub fn load_all(data_directory: &Path) -> Result<WorkspaceLoad, String> {
    read(data_directory, combined_view)
}

fn combined_view(state: &Value) -> Result<WorkspaceLoad, String> {
    if workspace_model::usable_workspace_count(state) < 2 {
        return Err(
            "All Workspaces needs at least two workspaces that are not archived.".to_string(),
        );
    }
    Ok(combined::combined_load(state))
}

/// Records which workspace (or All Workspaces) reopens on next launch. Opening reads
/// with `load`/`load_all` first, so this write stays off the switching path.
pub fn select(data_directory: &Path, workspace_id: &str) -> Result<(), String> {
    mutate_when(data_directory, |state| {
        let changed = apply_selection(state, workspace_id)?;
        Ok(((), changed))
    })
}

/// Applies a selection and reports whether it differs from the saved one.
fn apply_selection(state: &mut Value, workspace_id: &str) -> Result<bool, String> {
    let was_all = workspace_model::is_all_workspaces_view(state);
    let previous_id = workspace_model::active_workspace_id(state).map(str::to_string);
    if workspace_id == workspace_model::ALL_WORKSPACES_ID {
        lifecycle::activate_all(state)?;
        return Ok(!was_all);
    }
    lifecycle::activate(state, workspace_id)?;
    Ok(was_all || previous_id.as_deref() != Some(workspace_id))
}

/// Saves the renderer snapshot into its workspace after revision checks.
pub fn save_snapshot(data_directory: &Path, request: &SaveRequest) -> Result<Value, String> {
    state_store::with_state_write_lock(|| save_snapshot_locked(data_directory, request))
}

fn save_snapshot_locked(data_directory: &Path, request: &SaveRequest) -> Result<Value, String> {
    let current_state = state_store::load_canonical_state_for_write(data_directory)?;
    let (state, outcome) = save::apply_save(&current_state, request)?;
    let warning_message = state_store::persist_state_to_directory(data_directory, &state)?;
    let mut payload = serde_json::to_value(outcome)
        .map_err(|error| format!("Unable to encode save result: {error}"))?;
    if let Some(warning_message) = warning_message {
        payload["warningMessage"] = Value::String(warning_message);
    }
    Ok(payload)
}

pub fn list(data_directory: &Path) -> Result<WorkspaceCatalog, String> {
    read(data_directory, |state| Ok(catalog::catalog(state)))
}

pub fn load(data_directory: &Path, workspace_id: &str) -> Result<WorkspaceLoad, String> {
    read(data_directory, |state| {
        catalog::workspace_load(state, workspace_id)
    })
}

pub fn snapshots(data_directory: &Path) -> Result<Vec<WorkspaceSnapshotEntry>, String> {
    read(data_directory, |state| Ok(catalog::usable_snapshots(state)))
}

pub fn create(
    data_directory: &Path,
    request: &CreateRequest,
    default_settings: &Value,
) -> Result<WorkspaceCreated, String> {
    mutate(data_directory, |state| {
        let workspace_id = lifecycle::create(state, request, default_settings)?;
        Ok(WorkspaceCreated {
            catalog: catalog::catalog(state),
            workspace_id,
        })
    })
}

pub fn rename(
    data_directory: &Path,
    workspace_id: &str,
    name: &str,
) -> Result<WorkspaceCatalog, String> {
    mutate(data_directory, |state| {
        lifecycle::rename(state, workspace_id, name)?;
        Ok(catalog::catalog(state))
    })
}

pub fn set_archived(
    data_directory: &Path,
    workspace_id: &str,
    archived: bool,
) -> Result<WorkspaceCatalog, String> {
    mutate(data_directory, |state| {
        lifecycle::set_archived(state, workspace_id, archived)?;
        Ok(catalog::catalog(state))
    })
}

pub fn delete(data_directory: &Path, request: &DeleteRequest) -> Result<WorkspaceCatalog, String> {
    mutate(data_directory, |state| {
        lifecycle::delete(state, request)?;
        Ok(catalog::catalog(state))
    })
}

/// Moves books atomically; a dependency conflict returns without writing anything.
pub fn transfer_books(
    data_directory: &Path,
    request: &TransferRequest,
) -> Result<TransferResult, String> {
    mutate_when(data_directory, |state| {
        let outcome = transfer::transfer_books(state, request)?;
        let should_persist = matches!(outcome, TransferOutcome::Moved(_));
        let result = TransferResult {
            catalog: catalog::catalog(state),
            outcome,
        };
        Ok((result, should_persist))
    })
}

pub fn set_session_completion(
    data_directory: &Path,
    request: &CompletionRequest,
) -> Result<WorkspaceCatalog, String> {
    mutate(data_directory, |state| {
        completion::set_session_completion(state, request)?;
        Ok(catalog::catalog(state))
    })
}

fn read<T>(
    data_directory: &Path,
    operation: impl FnOnce(&Value) -> Result<T, String>,
) -> Result<T, String> {
    let state = loaded_app_state(data_directory)?;
    operation(&state)
}

fn mutate<T>(
    data_directory: &Path,
    operation: impl FnOnce(&mut Value) -> Result<T, String>,
) -> Result<T, String> {
    mutate_when(data_directory, |state| {
        operation(state).map(|result| (result, true))
    })
}

fn mutate_when<T>(
    data_directory: &Path,
    operation: impl FnOnce(&mut Value) -> Result<(T, bool), String>,
) -> Result<T, String> {
    state_store::with_state_write_lock(|| mutate_locked(data_directory, operation))
}

fn mutate_locked<T>(
    data_directory: &Path,
    operation: impl FnOnce(&mut Value) -> Result<(T, bool), String>,
) -> Result<T, String> {
    let mut state = loaded_app_state(data_directory)?;
    let (result, should_persist) = operation(&mut state)?;
    if should_persist {
        state_store::persist_state_to_directory(data_directory, &state)?;
    }
    Ok(result)
}

fn loaded_app_state(data_directory: &Path) -> Result<Value, String> {
    let state = state_store::load_canonical_state_for_write(data_directory)?;
    if state.is_null() {
        return Err(
            "Bartleby has no saved data yet. Add a book or change a setting first, then try again."
                .to_string(),
        );
    }
    workspace_model::ensure_app_state(&state)
}

fn snapshot_of<'a>(state: &'a Value, workspace_id: &str) -> Result<&'a Value, String> {
    workspace_model::find_workspace(state, workspace_id)
        .and_then(|entry| entry.get(workspace_model::KEY_SNAPSHOT))
        .ok_or_else(|| format!("Workspace {workspace_id} does not exist."))
}

fn snapshot_mut<'a>(state: &'a mut Value, workspace_id: &str) -> Result<&'a mut Value, String> {
    workspace_model::find_workspace_mut(state, workspace_id)
        .and_then(|entry| entry.get_mut(workspace_model::KEY_SNAPSHOT))
        .ok_or_else(|| format!("Workspace {workspace_id} does not exist."))
}
