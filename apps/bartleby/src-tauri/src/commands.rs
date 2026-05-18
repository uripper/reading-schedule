//! Tauri command handlers for the Bartleby migration foundation.
use crate::{app_paths, book_search, cover_store, native_planner, state_store, window_zoom};
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
pub async fn cover_normalize_saved_state(
    app: tauri::AppHandle,
) -> Result<state_store::CoverNormalizationResult, String> {
    let data_directory = app_paths::canonical_data_directory(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        state_store::normalize_cover_state_to_directory(&data_directory)
    })
    .await
    .map_err(|error| format!("Cover normalization task join error: {error}"))?
}

#[tauri::command]
pub async fn plan_generate(payload: Value) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || native_planner::generate_plan(payload))
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
    window: tauri::WebviewWindow,
    zoom_state: tauri::State<'_, window_zoom::ZoomState>,
) -> Result<f64, String> {
    window_zoom::zoom_in(zoom_state, window)
}

#[tauri::command]
pub fn window_zoom_out(
    window: tauri::WebviewWindow,
    zoom_state: tauri::State<'_, window_zoom::ZoomState>,
) -> Result<f64, String> {
    window_zoom::zoom_out(zoom_state, window)
}

#[tauri::command]
pub fn window_zoom_reset(
    window: tauri::WebviewWindow,
    zoom_state: tauri::State<'_, window_zoom::ZoomState>,
) -> Result<f64, String> {
    window_zoom::zoom_reset(zoom_state, window)
}
