//! Tauri command handlers for workspace persistence and lifecycle operations.
use serde_json::Value;

use crate::{app_paths, native_planner, state_store, workspaces};

#[tauri::command]
pub fn state_load(app: tauri::AppHandle) -> Result<Value, String> {
    workspaces::project_active_load(state_store::load_app_state(&app)?)
}

#[tauri::command]
pub fn state_save(
    app: tauri::AppHandle,
    request: workspaces::SaveRequest,
) -> Result<Value, String> {
    workspaces::save_snapshot(&app_paths::canonical_data_directory(&app)?, &request)
}

#[tauri::command]
pub fn workspace_list(app: tauri::AppHandle) -> Result<workspaces::WorkspaceCatalog, String> {
    workspaces::list(&app_paths::canonical_data_directory(&app)?)
}

#[tauri::command]
pub fn workspace_load(
    app: tauri::AppHandle,
    workspace_id: String,
) -> Result<workspaces::WorkspaceLoad, String> {
    workspaces::load(&app_paths::canonical_data_directory(&app)?, &workspace_id)
}

#[tauri::command]
pub fn workspace_snapshots(
    app: tauri::AppHandle,
) -> Result<Vec<workspaces::WorkspaceSnapshotEntry>, String> {
    workspaces::snapshots(&app_paths::canonical_data_directory(&app)?)
}

#[tauri::command]
pub fn workspace_select(app: tauri::AppHandle, workspace_id: String) -> Result<(), String> {
    workspaces::select(&app_paths::canonical_data_directory(&app)?, &workspace_id)
}

#[tauri::command]
pub fn workspace_create(
    app: tauri::AppHandle,
    request: workspaces::CreateRequest,
) -> Result<workspaces::WorkspaceCreated, String> {
    let default_settings = native_planner::sample_payload()?["settings"].clone();
    workspaces::create(
        &app_paths::canonical_data_directory(&app)?,
        &request,
        &default_settings,
    )
}

#[tauri::command]
pub fn workspace_rename(
    app: tauri::AppHandle,
    workspace_id: String,
    name: String,
) -> Result<workspaces::WorkspaceCatalog, String> {
    workspaces::rename(
        &app_paths::canonical_data_directory(&app)?,
        &workspace_id,
        &name,
    )
}

#[tauri::command]
pub fn workspace_set_archived(
    app: tauri::AppHandle,
    workspace_id: String,
    archived: bool,
) -> Result<workspaces::WorkspaceCatalog, String> {
    workspaces::set_archived(
        &app_paths::canonical_data_directory(&app)?,
        &workspace_id,
        archived,
    )
}

#[tauri::command]
pub fn workspace_delete(
    app: tauri::AppHandle,
    request: workspaces::DeleteRequest,
) -> Result<workspaces::WorkspaceCatalog, String> {
    workspaces::delete(&app_paths::canonical_data_directory(&app)?, &request)
}

#[tauri::command]
pub fn workspace_transfer_books(
    app: tauri::AppHandle,
    request: workspaces::TransferRequest,
) -> Result<workspaces::TransferResult, String> {
    workspaces::transfer_books(&app_paths::canonical_data_directory(&app)?, &request)
}

#[tauri::command]
pub fn workspace_set_session_completion(
    app: tauri::AppHandle,
    request: workspaces::CompletionRequest,
) -> Result<workspaces::WorkspaceCatalog, String> {
    workspaces::set_session_completion(&app_paths::canonical_data_directory(&app)?, &request)
}
