//! Saves the renderer's planner snapshot into exactly one workspace.
//!
//! A save names its workspace and the revision it was loaded at. A save for a deleted
//! or archived workspace, or one older than the stored revision (for example a queued
//! save that raced a book transfer), is rejected instead of overwriting newer data.
use serde::Serialize;
use serde_json::Value;

use super::requests::SaveRequest;
use crate::workspace_model;

/// The envelope to persist plus the renderer-facing save result.
type AppliedSave = (Value, SaveOutcome);

pub const STALE_REVISION_PREFIX: &str = "STALE_WORKSPACE_REVISION";

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveOutcome {
    pub ok: bool,
    pub revision: u64,
    /// Revision of every workspace after an All Workspaces save.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub revisions: Option<std::collections::HashMap<String, u64>>,
    pub workspace_id: String,
}

/// Returns the envelope to persist, creating the default workspace on first save.
pub fn apply_save(current_state: &Value, request: &SaveRequest) -> Result<AppliedSave, String> {
    if current_state.is_null() {
        return first_save(request);
    }
    let mut state = workspace_model::ensure_app_state(current_state)?;
    if request.workspace_id.as_deref() == Some(workspace_model::ALL_WORKSPACES_ID) {
        let revisions = super::combined_split::apply_combined_save(&mut state, request)?;
        let mut combined_outcome = outcome(workspace_model::ALL_WORKSPACES_ID.to_string(), 0);
        combined_outcome.revisions = Some(revisions);
        return Ok((state, combined_outcome));
    }
    let workspace_id = target_workspace_id(&state, request)?;
    check_revision(&state, &workspace_id, request.expected_revision)?;
    workspace_model::store_snapshot(&mut state, &workspace_id, &request.state)?;
    let revision = bump(&mut state, &workspace_id)?;
    Ok((state, outcome(workspace_id, revision)))
}

fn first_save(request: &SaveRequest) -> Result<AppliedSave, String> {
    let mut state = workspace_model::migrate_to_app_state(&request.state)?;
    let revision = bump(&mut state, workspace_model::DEFAULT_WORKSPACE_ID)?;
    Ok((
        state,
        outcome(workspace_model::DEFAULT_WORKSPACE_ID.to_string(), revision),
    ))
}

fn target_workspace_id(state: &Value, request: &SaveRequest) -> Result<String, String> {
    let workspace_id = request
        .workspace_id
        .clone()
        .or_else(|| workspace_model::active_workspace_id(state).map(str::to_string))
        .ok_or_else(|| "Saved state has no active workspace.".to_string())?;
    let entry = workspace_model::find_workspace(state, &workspace_id).ok_or_else(|| {
        format!("Workspace {workspace_id} no longer exists, so these changes were not saved.")
    })?;
    if workspace_model::is_archived(entry) {
        return Err("This workspace is archived. Restore it before editing.".to_string());
    }
    Ok(workspace_id)
}

fn check_revision(
    state: &Value,
    workspace_id: &str,
    expected_revision: Option<u64>,
) -> Result<(), String> {
    let Some(expected_revision) = expected_revision else {
        return Ok(());
    };
    let stored_revision = workspace_model::find_workspace(state, workspace_id)
        .map(workspace_model::revision)
        .unwrap_or_default();
    if stored_revision == expected_revision {
        return Ok(());
    }
    Err(format!(
        "{STALE_REVISION_PREFIX}: This workspace changed after it was loaded (revision {expected_revision}, saved {stored_revision}). Reload the workspace before saving again."
    ))
}

fn bump(state: &mut Value, workspace_id: &str) -> Result<u64, String> {
    let entry = workspace_model::find_workspace_mut(state, workspace_id)
        .ok_or_else(|| format!("Workspace {workspace_id} does not exist."))?;
    workspace_model::bump_revision(entry);
    entry[workspace_model::KEY_NEEDS_REPLAN] = Value::Bool(false);
    Ok(workspace_model::revision(entry))
}

fn outcome(workspace_id: String, revision: u64) -> SaveOutcome {
    SaveOutcome {
        ok: true,
        revision,
        revisions: None,
        workspace_id,
    }
}
