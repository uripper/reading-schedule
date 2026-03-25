use std::fs;
use std::path::{Path, PathBuf};

use directories::BaseDirs;
use tauri::{AppHandle, Manager};

const BOOK_COVERS_DIRECTORY_NAME: &str = "book_covers";
const LEGACY_ELECTRON_APP_NAME: &str = "reading-plan-gui";
const LEGACY_TAURI_COVERS_DIRECTORY_NAME: &str = "covers";

pub fn canonical_data_directory(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_local_data_dir()
        .map_err(|_| "Unable to resolve app data directory.".to_string())?;
    ensure_directory(&directory)?;
    Ok(directory)
}

pub fn canonical_cover_directory(data_directory: &Path) -> Result<PathBuf, String> {
    let directory = data_directory.join(BOOK_COVERS_DIRECTORY_NAME);
    ensure_directory(&directory)?;
    Ok(directory)
}

pub fn legacy_tauri_cover_directory(data_directory: &Path) -> PathBuf {
    data_directory.join(LEGACY_TAURI_COVERS_DIRECTORY_NAME)
}

pub fn ensure_directory(directory: &Path) -> Result<(), String> {
    fs::create_dir_all(directory)
        .map_err(|error| format!("Unable to create app data directory: {error}"))
}

#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn legacy_electron_data_directory() -> Option<PathBuf> {
    None
}

#[cfg(target_os = "linux")]
fn legacy_electron_root_directory(base_dirs: &BaseDirs) -> PathBuf {
    base_dirs.config_dir().to_path_buf()
}

#[cfg(target_os = "macos")]
fn legacy_electron_root_directory(base_dirs: &BaseDirs) -> PathBuf {
    base_dirs.data_dir().to_path_buf()
}

#[cfg(target_os = "windows")]
fn legacy_electron_root_directory(base_dirs: &BaseDirs) -> PathBuf {
    base_dirs.data_dir().to_path_buf()
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn legacy_electron_data_directory() -> Option<PathBuf> {
    let base_dirs = BaseDirs::new()?;
    Some(legacy_electron_root_directory(&base_dirs).join(LEGACY_ELECTRON_APP_NAME))
}
