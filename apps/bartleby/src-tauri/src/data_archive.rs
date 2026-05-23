use std::fs;
use std::path::Path;

use base64::{engine::general_purpose::STANDARD, Engine as _};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::{app_paths, state_store};

mod import_archive;
mod import_verify;
mod portable_state;

const ARCHIVE_FORMAT_VERSION: u8 = 1;
const BACKUP_FILE_PREFIX: &str = "bartleby-backup";
const BOOK_COVERS_DIRECTORY_PATH: &str = "book_covers";
const STATE_ARCHIVE_FILE_PATH: &str = "planner_state.json";
const ZOOM_SETTINGS_FILE_PATH: &str = "window_zoom_factor.txt";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppDataExport {
    pub file_name: String,
    pub payload_json: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppDataImportResult {
    pub books_restored: usize,
    pub completion_entries_restored: usize,
    pub directories_restored: usize,
    pub files_restored: usize,
    pub schedule_rows_restored: usize,
    pub sessions_restored: usize,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppDataArchive {
    created_at: String,
    directories: Vec<String>,
    files: Vec<AppDataArchiveFile>,
    format_version: u8,
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppDataArchiveFile {
    bytes_base64: String,
    path: String,
}

pub fn export_app_data(app: &AppHandle) -> Result<AppDataExport, String> {
    let data_directory = app_paths::canonical_data_directory(app)?;
    portable_state::prepare_directory_for_export(&data_directory)?;
    let archive = archive_from_directory(&data_directory)?;
    let payload_json = serde_json::to_string_pretty(&archive)
        .map_err(|error| format!("Unable to encode app data export: {error}"))?;
    Ok(AppDataExport {
        file_name: export_file_name(),
        payload_json,
    })
}

pub fn import_app_data(app: &AppHandle, payload_json: &str) -> Result<AppDataImportResult, String> {
    let data_directory = app_paths::canonical_data_directory(app)?;
    import_archive::import_archive_json_to_directory(&data_directory, payload_json)
}

#[cfg(test)]
pub(crate) fn export_archive_json_for_test(data_directory: &Path) -> Result<String, String> {
    portable_state::prepare_directory_for_export(data_directory)?;
    let archive = archive_from_directory(data_directory)?;
    serde_json::to_string_pretty(&archive)
        .map_err(|error| format!("Unable to encode app data export: {error}"))
}

#[cfg(test)]
pub(crate) fn import_archive_json_for_test(
    data_directory: &Path,
    payload_json: &str,
) -> Result<AppDataImportResult, String> {
    import_archive::import_archive_json_to_directory(data_directory, payload_json)
}

fn export_file_name() -> String {
    format!(
        "{BACKUP_FILE_PREFIX}-{}.json",
        Utc::now().format("%Y%m%d-%H%M%S")
    )
}

fn archive_from_directory(data_directory: &Path) -> Result<AppDataArchive, String> {
    let mut archive = AppDataArchive {
        created_at: Utc::now().to_rfc3339(),
        directories: Vec::new(),
        files: Vec::new(),
        format_version: ARCHIVE_FORMAT_VERSION,
    };
    append_portable_archive_entries(data_directory, &mut archive)?;
    archive.directories.sort();
    archive
        .files
        .sort_by(|left, right| left.path.cmp(&right.path));
    Ok(archive)
}

fn append_portable_archive_entries(
    data_directory: &Path,
    archive: &mut AppDataArchive,
) -> Result<(), String> {
    append_state_snapshot_file(data_directory, archive)?;
    append_zoom_settings_file(data_directory, archive)?;
    append_cover_files(data_directory, archive)
}

fn append_state_snapshot_file(
    data_directory: &Path,
    archive: &mut AppDataArchive,
) -> Result<(), String> {
    let state = state_store::load_state_value_from_directory(data_directory);
    let state_bytes = serde_json::to_vec_pretty(&state)
        .map_err(|error| format!("Unable to encode exported state snapshot: {error}"))?;
    archive
        .files
        .push(encoded_archive_file(STATE_ARCHIVE_FILE_PATH, state_bytes));
    Ok(())
}

fn append_zoom_settings_file(
    data_directory: &Path,
    archive: &mut AppDataArchive,
) -> Result<(), String> {
    let zoom_settings_path = data_directory.join(ZOOM_SETTINGS_FILE_PATH);
    if !zoom_settings_path.exists() {
        return Ok(());
    }
    let zoom_settings_bytes = fs::read(&zoom_settings_path)
        .map_err(|error| format!("Unable to read zoom settings: {error}"))?;
    archive.files.push(encoded_archive_file(
        ZOOM_SETTINGS_FILE_PATH,
        zoom_settings_bytes,
    ));
    Ok(())
}

fn append_cover_files(data_directory: &Path, archive: &mut AppDataArchive) -> Result<(), String> {
    let cover_directory = data_directory.join(BOOK_COVERS_DIRECTORY_PATH);
    if !cover_directory.exists() {
        return Ok(());
    }
    archive
        .directories
        .push(BOOK_COVERS_DIRECTORY_PATH.to_string());
    let mut entries = fs::read_dir(&cover_directory)
        .map_err(|error| format!("Unable to read cover directory: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Unable to inspect cover directory: {error}"))?;
    entries.sort_by_key(|entry| entry.file_name());
    for entry in entries {
        append_cover_entry(archive, &cover_directory, &entry)?;
    }
    Ok(())
}

fn append_cover_entry(
    archive: &mut AppDataArchive,
    cover_directory: &Path,
    entry: &fs::DirEntry,
) -> Result<(), String> {
    let path = entry.path();
    let file_type = entry
        .file_type()
        .map_err(|error| format!("Unable to inspect cover entry: {error}"))?;
    if !file_type.is_file() {
        return Ok(());
    }
    append_cover_archive_file(archive, cover_directory, &path)
}

fn append_cover_archive_file(
    archive: &mut AppDataArchive,
    cover_directory: &Path,
    path: &Path,
) -> Result<(), String> {
    let bytes = fs::read(path).map_err(|error| format!("Unable to read cover file: {error}"))?;
    let relative_path = relative_archive_path(cover_directory, path)?;
    archive.files.push(encoded_archive_file(
        &format!("{BOOK_COVERS_DIRECTORY_PATH}/{relative_path}"),
        bytes,
    ));
    Ok(())
}

fn encoded_archive_file(path: &str, bytes: Vec<u8>) -> AppDataArchiveFile {
    AppDataArchiveFile {
        bytes_base64: STANDARD.encode(bytes),
        path: path.to_string(),
    }
}

pub(super) fn relative_archive_path(root: &Path, path: &Path) -> Result<String, String> {
    path.strip_prefix(root)
        .map_err(|error| format!("Unable to resolve app data path: {error}"))
        .map(|relative| relative.to_string_lossy().replace('\\', "/"))
}
