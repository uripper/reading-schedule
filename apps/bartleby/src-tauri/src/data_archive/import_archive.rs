use std::collections::HashSet;
use std::fs;
use std::path::{Component, Path, PathBuf};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use uuid::Uuid;

use crate::{app_paths, state_store};

use super::{
    import_verify, portable_state, relative_archive_path, AppDataArchive, AppDataImportResult,
    ARCHIVE_FORMAT_VERSION, BOOK_COVERS_DIRECTORY_PATH, STATE_ARCHIVE_FILE_PATH,
    ZOOM_SETTINGS_FILE_PATH,
};

pub(super) fn import_archive_json_to_directory(
    data_directory: &Path,
    payload_json: &str,
) -> Result<AppDataImportResult, String> {
    let archive = parse_archive(payload_json)?;
    let stage_directory = stage_directory_path(data_directory)?;
    write_archive_to_directory(&stage_directory, &archive)?;
    let import_result = apply_staged_archive(data_directory, &stage_directory)
        .map(|verification| app_data_import_result(&archive, verification));
    let _ = fs::remove_dir_all(&stage_directory);
    import_result
}

fn app_data_import_result(
    archive: &AppDataArchive,
    verification: import_verify::ImportVerification,
) -> AppDataImportResult {
    AppDataImportResult {
        books_restored: verification.books_restored,
        completion_entries_restored: verification.completion_entries_restored,
        directories_restored: archive.directories.len(),
        files_restored: archive.files.len(),
        schedule_rows_restored: verification.schedule_rows_restored,
        sessions_restored: verification.sessions_restored,
    }
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
    validate_archive_directories(archive)?;
    validate_archive_files(archive)?;
    if !archive_includes_state_file(archive) {
        return Err(format!(
            "Imported data archive did not contain {STATE_ARCHIVE_FILE_PATH}."
        ));
    }
    Ok(())
}

fn validate_archive_directories(archive: &AppDataArchive) -> Result<(), String> {
    let mut directory_paths = HashSet::new();
    for directory in &archive.directories {
        validate_unique_archive_path(directory, &mut directory_paths)?;
    }
    Ok(())
}

fn validate_archive_files(archive: &AppDataArchive) -> Result<(), String> {
    let mut file_paths = HashSet::new();
    for file in &archive.files {
        validate_unique_archive_path(&file.path, &mut file_paths)?;
    }
    Ok(())
}

fn archive_includes_state_file(archive: &AppDataArchive) -> bool {
    archive
        .files
        .iter()
        .any(|file| file.path == STATE_ARCHIVE_FILE_PATH)
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
    archive_target_path_from_components(root, path, relative_path)
}

fn archive_target_path_from_components(
    root: &Path,
    path: &Path,
    relative_path: &str,
) -> Result<PathBuf, String> {
    let mut target_path = PathBuf::from(root);
    for component in path.components() {
        match component {
            Component::Normal(segment) => target_path.push(segment),
            _ => return Err(format!("Archive entry path was invalid: {relative_path}")),
        }
    }
    Ok(target_path)
}

fn apply_staged_archive(
    data_directory: &Path,
    stage_directory: &Path,
) -> Result<import_verify::ImportVerification, String> {
    let staged_state = portable_state::load_imported_state(stage_directory)?;
    let staged_state = portable_state::repaired_cover_paths(&staged_state, stage_directory)?;
    sync_staged_cover_files(stage_directory, data_directory)?;
    sync_staged_zoom_settings(stage_directory, data_directory)?;
    let imported_state = portable_state::repaired_cover_paths(&staged_state, data_directory)?;
    let verification = import_verify::verify_imported_state(&imported_state)?;
    state_store::save_state_to_directory(data_directory, &imported_state)?;
    Ok(verification)
}

fn stage_directory_path(data_directory: &Path) -> Result<PathBuf, String> {
    let parent_directory = data_directory
        .parent()
        .ok_or_else(|| "Unable to locate app data parent directory.".to_string())?;
    let directory_name = data_directory
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Unable to resolve app data directory name.".to_string())?;
    Ok(parent_directory.join(format!("{directory_name}.import-stage-{}", Uuid::new_v4())))
}

fn sync_staged_cover_files(stage_directory: &Path, data_directory: &Path) -> Result<(), String> {
    let staged_cover_directory = stage_directory.join(BOOK_COVERS_DIRECTORY_PATH);
    if !staged_cover_directory.exists() {
        return Ok(());
    }
    let target_cover_directory = app_paths::canonical_cover_directory(data_directory)?;
    copy_directory_files(
        &staged_cover_directory,
        &staged_cover_directory,
        &target_cover_directory,
    )
}

fn copy_directory_files(root: &Path, current: &Path, target_root: &Path) -> Result<(), String> {
    let mut entries = fs::read_dir(current)
        .map_err(|error| format!("Unable to read staged import directory: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Unable to inspect staged import directory: {error}"))?;
    entries.sort_by_key(|entry| entry.file_name());
    for entry in entries {
        copy_directory_entry(root, target_root, &entry)?;
    }
    Ok(())
}

fn copy_directory_entry(
    root: &Path,
    target_root: &Path,
    entry: &fs::DirEntry,
) -> Result<(), String> {
    let path = entry.path();
    let relative_path = relative_archive_path(root, &path)?;
    let file_type = entry
        .file_type()
        .map_err(|error| format!("Unable to inspect staged import entry: {error}"))?;
    if file_type.is_dir() {
        copy_staged_directory_entry(root, target_root, &path)?;
        return Ok(());
    }
    if file_type.is_file() {
        copy_staged_file_entry(target_root, &path, &relative_path)?;
    }
    Ok(())
}

fn copy_staged_directory_entry(root: &Path, target_root: &Path, path: &Path) -> Result<(), String> {
    let relative_path = relative_archive_path(root, path)?;
    let target_directory = target_root.join(relative_path);
    fs::create_dir_all(&target_directory)
        .map_err(|error| format!("Unable to create imported cover folder: {error}"))?;
    copy_directory_files(root, path, target_root)
}

fn copy_staged_file_entry(
    target_root: &Path,
    path: &Path,
    relative_path: &str,
) -> Result<(), String> {
    let target_path = target_root.join(relative_path);
    let target_parent = target_path
        .parent()
        .ok_or_else(|| format!("Unable to resolve imported cover parent for {relative_path}"))?;
    fs::create_dir_all(target_parent)
        .map_err(|error| format!("Unable to create imported cover parent: {error}"))?;
    let bytes =
        fs::read(path).map_err(|error| format!("Unable to read staged cover file: {error}"))?;
    fs::write(&target_path, bytes)
        .map_err(|error| format!("Unable to write imported cover file: {error}"))
}

fn sync_staged_zoom_settings(stage_directory: &Path, data_directory: &Path) -> Result<(), String> {
    let staged_zoom_settings = stage_directory.join(ZOOM_SETTINGS_FILE_PATH);
    let target_zoom_settings = data_directory.join(ZOOM_SETTINGS_FILE_PATH);
    if !staged_zoom_settings.exists() {
        return clear_target_zoom_settings(&target_zoom_settings);
    }
    let zoom_bytes = fs::read(&staged_zoom_settings)
        .map_err(|error| format!("Unable to read staged zoom settings: {error}"))?;
    fs::write(&target_zoom_settings, zoom_bytes)
        .map_err(|error| format!("Unable to write imported zoom settings: {error}"))
}

fn clear_target_zoom_settings(target_zoom_settings: &Path) -> Result<(), String> {
    if !target_zoom_settings.exists() {
        return Ok(());
    }
    fs::remove_file(target_zoom_settings)
        .map_err(|error| format!("Unable to clear zoom settings during import: {error}"))
}

fn write_archive_to_directory(
    data_directory: &Path,
    archive: &AppDataArchive,
) -> Result<(), String> {
    fs::create_dir_all(data_directory)
        .map_err(|error| format!("Unable to create imported app data directory: {error}"))?;
    write_archive_directories(data_directory, archive)?;
    write_archive_files(data_directory, archive)
}

fn write_archive_directories(
    data_directory: &Path,
    archive: &AppDataArchive,
) -> Result<(), String> {
    for directory in &archive.directories {
        let directory_path = archive_target_path(data_directory, directory)?;
        fs::create_dir_all(&directory_path)
            .map_err(|error| format!("Unable to create imported app data folder: {error}"))?;
    }
    Ok(())
}

fn write_archive_files(data_directory: &Path, archive: &AppDataArchive) -> Result<(), String> {
    for file in &archive.files {
        let file_path = archive_target_path(data_directory, &file.path)?;
        write_archive_file(file, &file_path)?;
    }
    Ok(())
}

fn write_archive_file(file: &super::AppDataArchiveFile, file_path: &Path) -> Result<(), String> {
    let parent_directory = file_path
        .parent()
        .ok_or_else(|| format!("Unable to resolve parent directory for {}", file.path))?;
    fs::create_dir_all(parent_directory)
        .map_err(|error| format!("Unable to create imported file parent: {error}"))?;
    let bytes = STANDARD
        .decode(&file.bytes_base64)
        .map_err(|error| format!("Unable to decode archived file {}: {error}", file.path))?;
    fs::write(file_path, bytes)
        .map_err(|error| format!("Unable to write imported file {}: {error}", file.path))
}
