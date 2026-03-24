//! Tauri command handlers for the Bartleby migration foundation.
use std::fs;
use std::path::PathBuf;

use crate::{book_search, native_planner, state_store, window_zoom};
use base64::Engine;
use directories::ProjectDirs;
use reqwest::header::CONTENT_TYPE;
use serde_json::Value;

fn app_data_directory() -> Result<PathBuf, String> {
    let dirs = ProjectDirs::from("com", "bartleby", "Bartleby")
        .ok_or_else(|| "Unable to resolve app data directory.".to_string())?;
    let directory = dirs.data_local_dir().to_path_buf();
    fs::create_dir_all(&directory)
        .map_err(|error| format!("Unable to create app data directory: {error}"))?;
    Ok(directory)
}

fn covers_directory() -> Result<PathBuf, String> {
    let directory = app_data_directory()?.join("covers");
    fs::create_dir_all(&directory)
        .map_err(|error| format!("Unable to create cover directory: {error}"))?;
    Ok(directory)
}

fn sanitize_file_stem(value: &str) -> String {
    let sanitized = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || character == '-' || character == '_' {
                character
            } else {
                '_'
            }
        })
        .collect::<String>();
    if sanitized.is_empty() {
        return "cover".to_string();
    }
    sanitized
}

fn extension_for_content_type(content_type: Option<&str>) -> &'static str {
    if let Some(value) = content_type {
        if value.contains("png") {
            return ".png";
        }
        if value.contains("webp") {
            return ".webp";
        }
    }
    ".jpg"
}

fn write_cover_bytes(book_id: &str, extension: &str, bytes: &[u8]) -> Result<String, String> {
    let file_name = format!("{}{}", sanitize_file_stem(book_id), extension);
    let file_path = covers_directory()?.join(file_name);
    fs::write(&file_path, bytes)
        .map_err(|error| format!("Unable to write cover asset: {error}"))?;
    Ok(file_path.to_string_lossy().into_owned())
}

fn parse_data_url(data_url: &str) -> Result<(&str, &str), String> {
    let (metadata, encoded) = data_url
        .split_once(',')
        .ok_or_else(|| "Cover data URL is invalid.".to_string())?;
    if !metadata.starts_with("data:") || !metadata.ends_with(";base64") {
        return Err("Cover data URL must be base64 encoded.".to_string());
    }
    Ok((metadata, encoded))
}

#[tauri::command]
pub async fn books_search(
    query: String,
    author: bool,
) -> Result<Vec<book_search::SearchItem>, String> {
    book_search::search_books(&query, author).await
}

#[tauri::command]
pub async fn cover_download(
    url: Option<String>,
    book_id: Option<String>,
) -> Result<String, String> {
    let cover_url = url.ok_or_else(|| "Cover URL is required.".to_string())?;
    let target_book_id =
        book_id.ok_or_else(|| "Book ID is required to store a cover.".to_string())?;
    let response = reqwest::Client::new()
        .get(cover_url)
        .send()
        .await
        .and_then(|response| response.error_for_status())
        .map_err(|error| format!("Unable to download cover: {error}"))?;
    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.to_string());
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("Unable to read cover bytes: {error}"))?;
    write_cover_bytes(
        &target_book_id,
        extension_for_content_type(content_type.as_deref()),
        bytes.as_ref(),
    )
}

#[tauri::command]
pub fn cover_import(data_url: Option<String>, book_id: Option<String>) -> Result<String, String> {
    let raw_data_url = data_url.ok_or_else(|| "Cover data is required.".to_string())?;
    let target_book_id =
        book_id.ok_or_else(|| "Book ID is required to store a cover.".to_string())?;
    let (metadata, encoded) = parse_data_url(&raw_data_url)?;
    let extension = extension_for_content_type(Some(metadata));
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(encoded)
        .map_err(|error| format!("Unable to decode cover data: {error}"))?;
    write_cover_bytes(&target_book_id, extension, &bytes)
}

#[tauri::command]
pub fn plan_generate(payload: Value) -> Result<Value, String> {
    native_planner::generate_plan(payload)
}

#[tauri::command]
pub fn plan_sample() -> Result<Value, String> {
    native_planner::sample_payload()
}

#[tauri::command]
pub fn state_load() -> Result<Value, String> {
    state_store::load_state(&app_data_directory()?)
}

#[tauri::command]
pub fn state_save(state: Value) -> Result<Value, String> {
    state_store::save_state(&app_data_directory()?, &state)
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
