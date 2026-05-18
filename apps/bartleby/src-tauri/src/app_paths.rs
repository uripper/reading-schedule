use std::fs;
use std::path::{Path, PathBuf};

use directories::BaseDirs;
use tauri::{AppHandle, Manager};

const BOOK_COVERS_DIRECTORY_NAME: &str = "book_covers";
const LEGACY_BARTLEBY_APP_NAME: &str = "Bartleby";
const LEGACY_READING_PLAN_APP_NAME: &str = "reading-plan-gui";

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

pub fn ensure_directory(directory: &Path) -> Result<(), String> {
    fs::create_dir_all(directory)
        .map_err(|error| format!("Unable to create app data directory: {error}"))
}

#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn legacy_desktop_data_directories() -> Vec<PathBuf> {
    Vec::new()
}

#[cfg(target_os = "linux")]
fn legacy_desktop_root_directory(base_dirs: &BaseDirs) -> PathBuf {
    base_dirs.config_dir().to_path_buf()
}

#[cfg(target_os = "macos")]
fn legacy_desktop_root_directory(base_dirs: &BaseDirs) -> PathBuf {
    base_dirs.data_dir().to_path_buf()
}

#[cfg(target_os = "windows")]
fn legacy_desktop_root_directory(base_dirs: &BaseDirs) -> PathBuf {
    base_dirs.data_dir().to_path_buf()
}

fn append_legacy_app_directories(directories: &mut Vec<PathBuf>, root_directory: PathBuf) {
    append_unique_directory(directories, root_directory.join(LEGACY_BARTLEBY_APP_NAME));
    append_unique_directory(
        directories,
        root_directory.join(LEGACY_READING_PLAN_APP_NAME),
    );
}

fn append_unique_directory(directories: &mut Vec<PathBuf>, directory: PathBuf) {
    if directories.contains(&directory) {
        return;
    }
    directories.push(directory);
}

#[cfg(target_os = "windows")]
pub fn legacy_desktop_data_directories() -> Vec<PathBuf> {
    let mut directories = Vec::new();
    if let Some(app_data) = std::env::var_os("APPDATA") {
        append_legacy_app_directories(&mut directories, PathBuf::from(app_data));
    }
    if let Some(base_dirs) = BaseDirs::new() {
        append_legacy_app_directories(&mut directories, legacy_desktop_root_directory(&base_dirs));
    }
    directories
}

#[cfg(not(any(target_os = "android", target_os = "ios", target_os = "windows")))]
pub fn legacy_desktop_data_directories() -> Vec<PathBuf> {
    let Some(base_dirs) = BaseDirs::new() else {
        return Vec::new();
    };
    let mut directories = Vec::new();
    append_legacy_app_directories(&mut directories, legacy_desktop_root_directory(&base_dirs));
    directories
}
