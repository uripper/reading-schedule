//! Serializable workspace summaries returned to the renderer.
use serde::Serialize;
use serde_json::Value;

use crate::workspace_model::{self, KEY_CREATED_AT, KEY_NAME, KEY_SNAPSHOT};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSummary {
    pub archived: bool,
    pub book_count: usize,
    pub created_at: String,
    pub id: String,
    pub name: String,
    pub revision: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceCatalog {
    pub active_workspace_id: String,
    pub workspaces: Vec<WorkspaceSummary>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceLoad {
    pub catalog: WorkspaceCatalog,
    pub needs_replan: bool,
    pub revision: u64,
    pub state: Value,
    pub workspace_id: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSnapshotEntry {
    pub state: Value,
    pub summary: WorkspaceSummary,
}

pub fn catalog(state: &Value) -> WorkspaceCatalog {
    WorkspaceCatalog {
        active_workspace_id: workspace_model::active_workspace_id(state)
            .unwrap_or_default()
            .to_string(),
        workspaces: workspace_model::workspaces(state)
            .iter()
            .map(summary)
            .collect(),
    }
}

pub fn summary(entry: &Value) -> WorkspaceSummary {
    let snapshot = entry.get(KEY_SNAPSHOT);
    WorkspaceSummary {
        archived: workspace_model::is_archived(entry),
        book_count: snapshot
            .and_then(|value| value.get("books"))
            .and_then(Value::as_array)
            .map_or(0, Vec::len),
        created_at: text(entry, KEY_CREATED_AT),
        id: text(entry, "id"),
        name: text(entry, KEY_NAME),
        revision: workspace_model::revision(entry),
    }
}

/// Builds the payload the renderer applies when it opens a workspace.
pub fn workspace_load(state: &Value, workspace_id: &str) -> Result<WorkspaceLoad, String> {
    let entry = workspace_model::find_workspace(state, workspace_id)
        .ok_or_else(|| format!("Workspace {workspace_id} does not exist."))?;
    Ok(WorkspaceLoad {
        catalog: catalog(state),
        needs_replan: workspace_model::needs_replan(entry),
        revision: workspace_model::revision(entry),
        state: workspace_model::project_snapshot(state, entry),
        workspace_id: workspace_id.to_string(),
    })
}

/// Lists every non-archived workspace with its merged snapshot for aggregate views.
pub fn usable_snapshots(state: &Value) -> Vec<WorkspaceSnapshotEntry> {
    workspace_model::workspaces(state)
        .iter()
        .filter(|entry| !workspace_model::is_archived(entry))
        .map(|entry| WorkspaceSnapshotEntry {
            state: workspace_model::project_snapshot(state, entry),
            summary: summary(entry),
        })
        .collect()
}

fn text(entry: &Value, key: &str) -> String {
    entry
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}
