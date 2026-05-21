//! Tauri command handlers for the Bartleby migration foundation.
use crate::{
    app_paths, book_search, cover_store, native_planner, plan_cache, state_store, window_zoom,
};
use serde_json::Value;

#[tauri::command]
pub async fn books_search(
    query: String,
    author: bool,
) -> Result<Vec<book_search::SearchItem>, String> {
    book_search::search_books(&query, author).await
}

#[tauri::command]
pub async fn cover_download(
    app: tauri::AppHandle,
    url: Option<String>,
    book_id: Option<String>,
) -> Result<String, String> {
    cover_store::download_cover(&app, url, book_id).await
}

#[tauri::command]
pub fn cover_import(
    app: tauri::AppHandle,
    data_url: Option<String>,
    book_id: Option<String>,
) -> Result<String, String> {
    cover_store::import_cover(&app, data_url, book_id)
}

#[tauri::command]
pub async fn state_run_maintenance(
    app: tauri::AppHandle,
) -> Result<state_store::StateMaintenanceResult, String> {
    let data_directory = app_paths::canonical_data_directory(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        state_store::run_state_maintenance(&data_directory)
    })
    .await
    .map_err(|error| format!("State maintenance task join error: {error}"))?
}

#[tauri::command]
pub async fn plan_generate(
    payload: Value,
    plan_cache_state: tauri::State<'_, plan_cache::PlanCacheState>,
) -> Result<Value, String> {
    let shared_cache = plan_cache_state.shared();
    let latest_request_id = plan_cache_state.latest_request_id();
    let request_id = plan_cache_state.next_request_id();
    tauri::async_runtime::spawn_blocking(move || {
        let request = plan_cache::PlanRequest::new(&latest_request_id, request_id);
        plan_cache::generate_plan(&shared_cache, request, payload)
    })
    .await
    .map_err(|error| format!("Planner task join error: {error}"))?
}

#[tauri::command]
pub fn plan_sample() -> Result<Value, String> {
    native_planner::sample_payload()
}

#[tauri::command]
pub fn state_load(app: tauri::AppHandle) -> Result<Value, String> {
    state_store::load_state(&app)
}

#[tauri::command]
pub fn state_save(app: tauri::AppHandle, state: Value) -> Result<Value, String> {
    state_store::save_state(&app, &state)
}

#[tauri::command]
pub fn window_zoom_in(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    zoom_state: tauri::State<'_, window_zoom::ZoomState>,
) -> Result<f64, String> {
    window_zoom::zoom_in(app, zoom_state, window)
}

#[tauri::command]
pub fn window_zoom_out(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    zoom_state: tauri::State<'_, window_zoom::ZoomState>,
) -> Result<f64, String> {
    window_zoom::zoom_out(app, zoom_state, window)
}

#[tauri::command]
pub fn window_zoom_reset(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    zoom_state: tauri::State<'_, window_zoom::ZoomState>,
) -> Result<f64, String> {
    window_zoom::zoom_reset(app, zoom_state, window)
}
