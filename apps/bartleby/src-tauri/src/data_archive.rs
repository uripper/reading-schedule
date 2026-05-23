use std::collections::HashSet;
use std::fs;
use std::path::{Component, Path, PathBuf};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use uuid::Uuid;

use crate::{app_paths, state_store};

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
    pub directories_restored: usize,
    pub files_restored: usize,
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

pub fn import_app_data(
    app: &AppHandle,
    payload_json: &str,
) -> Result<AppDataImportResult, String> {
    let data_directory = app_paths::canonical_data_directory(app)?;
    import_archive_json_to_directory(&data_directory, payload_json)
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
    import_archive_json_to_directory(data_directory, payload_json)
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
    archive.files.sort_by(|left, right| left.path.cmp(&right.path));
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
    archive.files.push(encoded_archive_file(
        STATE_ARCHIVE_FILE_PATH,
        state_bytes,
    ));
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

fn append_cover_files(
    data_directory: &Path,
    archive: &mut AppDataArchive,
) -> Result<(), String> {
    let cover_directory = data_directory.join(BOOK_COVERS_DIRECTORY_PATH);
    if !cover_directory.exists() {
        return Ok(());
    }
    archive.directories.push(BOOK_COVERS_DIRECTORY_PATH.to_string());
    let mut entries = fs::read_dir(&cover_directory)
        .map_err(|error| format!("Unable to read cover directory: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Unable to inspect cover directory: {error}"))?;
    entries.sort_by_key(|entry| entry.file_name());
    for entry in entries {
        let path = entry.path();
        let file_type = entry
            .file_type()
            .map_err(|error| format!("Unable to inspect cover entry: {error}"))?;
        if file_type.is_file() {
            let bytes = fs::read(&path)
                .map_err(|error| format!("Unable to read cover file: {error}"))?;
            let relative_path = relative_archive_path(&cover_directory, &path)?;
            archive.files.push(encoded_archive_file(
                &format!("{BOOK_COVERS_DIRECTORY_PATH}/{relative_path}"),
                bytes,
            ));
        }
    }
    Ok(())
}

fn encoded_archive_file(path: &str, bytes: Vec<u8>) -> AppDataArchiveFile {
    AppDataArchiveFile {
        bytes_base64: STANDARD.encode(bytes),
        path: path.to_string(),
    }
}

fn relative_archive_path(root: &Path, path: &Path) -> Result<String, String> {
    path.strip_prefix(root)
        .map_err(|error| format!("Unable to resolve app data path: {error}"))
        .map(|relative| relative.to_string_lossy().replace('\\', "/"))
}

fn import_archive_json_to_directory(
    data_directory: &Path,
    payload_json: &str,
) -> Result<AppDataImportResult, String> {
    let archive = parse_archive(payload_json)?;
    let stage_directory = stage_directory_path(data_directory)?;
    write_archive_to_directory(&stage_directory, &archive)?;
    let import_result = apply_staged_archive(data_directory, &stage_directory).map(|()| {
        AppDataImportResult {
            directories_restored: archive.directories.len(),
            files_restored: archive.files.len(),
        }
    });
    let _ = fs::remove_dir_all(&stage_directory);
    import_result
}

fn parse_archive(payload_json: &str) -> Result<AppDataArchive, String> {
    let archive = serde_json::from_str::<AppDataArchive>(payload_json)
        .map_err(|error| format!("Unable to parse data archive: {error}"))?;
    validate_archive(&archive)?;
    Ok(archive)
}

fn validate_archive(archive: &AppDataArchive) -> Result<(), String> {
    if archive.format_version != ARCHIVE_FORMAT_VERSION {
        return Err(format!(
            "Unsupported data archive format version: {}",
            archive.format_version
        ));
    }
    let mut directory_paths = HashSet::new();
    for directory in &archive.directories {
        validate_unique_archive_path(directory, &mut directory_paths)?;
    }
    let mut file_paths = HashSet::new();
    for file in &archive.files {
        validate_unique_archive_path(&file.path, &mut file_paths)?;
    }
    Ok(())
}

fn validate_unique_archive_path(
    relative_path: &str,
    seen_paths: &mut HashSet<String>,
) -> Result<(), String> {
    let normalized_path = archive_target_path(Path::new("."), relative_path)?;
    let key = normalized_path.to_string_lossy().into_owned();
    if !seen_paths.insert(key) {
        return Err(format!("Archive contains duplicate path: {relative_path}"));
    }
    Ok(())
}

fn archive_target_path(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    if relative_path.is_empty() {
        return Err("Archive entry path was empty.".to_string());
    }
    let path = Path::new(relative_path);
    if path.is_absolute() {
        return Err(format!("Archive entry path was absolute: {relative_path}"));
    }
    let mut target_path = PathBuf::from(root);
    for component in path.components() {
        match component {
            Component::Normal(segment) => target_path.push(segment),
            _ => {
                return Err(format!("Archive entry path was invalid: {relative_path}"));
            }
        }
    }
    Ok(target_path)
}

fn apply_staged_archive(
    data_directory: &Path,
    stage_directory: &Path,
) -> Result<(), String> {
    portable_state::repair_imported_state(stage_directory)?;
    sync_staged_cover_files(stage_directory, data_directory)?;
    sync_staged_zoom_settings(stage_directory, data_directory)?;
    let imported_state = state_store::load_state_value_from_directory(stage_directory);
    state_store::save_state_to_directory(data_directory, &imported_state)?;
    portable_state::repair_imported_state(data_directory)
}

fn stage_directory_path(data_directory: &Path) -> Result<PathBuf, String> {
    let parent_directory = data_directory
        .parent()
        .ok_or_else(|| "Unable to locate app data parent directory.".to_string())?;
    let directory_name = data_directory
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Unable to resolve app data directory name.".to_string())?;
    Ok(parent_directory.join(format!(
        "{directory_name}.import-stage-{}",
        Uuid::new_v4()
    )))
}

fn sync_staged_cover_files(
    stage_directory: &Path,
    data_directory: &Path,
) -> Result<(), String> {
    let staged_cover_directory = stage_directory.join(BOOK_COVERS_DIRECTORY_PATH);
    if !staged_cover_directory.exists() {
        return Ok(());
    }
    let target_cover_directory = app_paths::canonical_cover_directory(data_directory)?;
    copy_directory_files(&staged_cover_directory, &staged_cover_directory, &target_cover_directory)
}

fn copy_directory_files(
    root: &Path,
    current: &Path,
    target_root: &Path,
) -> Result<(), String> {
    let mut entries = fs::read_dir(current)
        .map_err(|error| format!("Unable to read staged import directory: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Unable to inspect staged import directory: {error}"))?;
    entries.sort_by_key(|entry| entry.file_name());
    for entry in entries {
        let path = entry.path();
        let relative_path = relative_archive_path(root, &path)?;
        let file_type = entry
            .file_type()
            .map_err(|error| format!("Unable to inspect staged import entry: {error}"))?;
        if file_type.is_dir() {
            let target_directory = target_root.join(&relative_path);
            fs::create_dir_all(&target_directory)
                .map_err(|error| format!("Unable to create imported cover folder: {error}"))?;
            copy_directory_files(root, &path, target_root)?;
            continue;
        }
        if file_type.is_file() {
            let target_path = target_root.join(&relative_path);
            let target_parent = target_path.parent().ok_or_else(|| {
                format!("Unable to resolve imported cover parent for {relative_path}")
            })?;
            fs::create_dir_all(target_parent)
                .map_err(|error| format!("Unable to create imported cover parent: {error}"))?;
            let bytes = fs::read(&path)
                .map_err(|error| format!("Unable to read staged cover file: {error}"))?;
            fs::write(&target_path, bytes)
                .map_err(|error| format!("Unable to write imported cover file: {error}"))?;
        }
    }
    Ok(())
}

fn sync_staged_zoom_settings(
    stage_directory: &Path,
    data_directory: &Path,
) -> Result<(), String> {
    let staged_zoom_settings = stage_directory.join(ZOOM_SETTINGS_FILE_PATH);
    let target_zoom_settings = data_directory.join(ZOOM_SETTINGS_FILE_PATH);
    if !staged_zoom_settings.exists() {
        if target_zoom_settings.exists() {
            fs::remove_file(&target_zoom_settings)
                .map_err(|error| format!("Unable to clear zoom settings during import: {error}"))?;
        }
        return Ok(());
    }
    let zoom_bytes = fs::read(&staged_zoom_settings)
        .map_err(|error| format!("Unable to read staged zoom settings: {error}"))?;
    fs::write(&target_zoom_settings, zoom_bytes)
        .map_err(|error| format!("Unable to write imported zoom settings: {error}"))
}

fn write_archive_to_directory(
    data_directory: &Path,
    archive: &AppDataArchive,
) -> Result<(), String> {
    fs::create_dir_all(data_directory)
        .map_err(|error| format!("Unable to create imported app data directory: {error}"))?;
    for directory in &archive.directories {
        let directory_path = archive_target_path(data_directory, directory)?;
        fs::create_dir_all(&directory_path)
            .map_err(|error| format!("Unable to create imported app data folder: {error}"))?;
    }
    for file in &archive.files {
        let file_path = archive_target_path(data_directory, &file.path)?;
        let parent_directory = file_path.parent().ok_or_else(|| {
            format!("Unable to resolve parent directory for {}", file.path)
        })?;
        fs::create_dir_all(parent_directory)
            .map_err(|error| format!("Unable to create imported file parent: {error}"))?;
        let bytes = STANDARD
            .decode(&file.bytes_base64)
            .map_err(|error| format!("Unable to decode archived file {}: {error}", file.path))?;
        fs::write(&file_path, bytes)
            .map_err(|error| format!("Unable to write imported file {}: {error}", file.path))?;
    }
    Ok(())
}