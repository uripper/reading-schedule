use std::path::{Path, PathBuf};

const JSON_STATE_BACKUP_FILE_NAME: &str = "planner_state.json.bak";
const JSON_STATE_FILE_NAME: &str = "planner_state.json";
const JSON_STATE_TEMP_FILE_NAME: &str = "planner_state.json.tmp";
const LEGACY_MIGRATION_MARKER_FILE_NAME: &str = "legacy_migration.done";
const SQLITE_SHM_FILE_NAME: &str = "planner_state.sqlite3-shm";
const SQLITE_STATE_FILE_NAME: &str = "planner_state.sqlite3";
const SQLITE_WAL_FILE_NAME: &str = "planner_state.sqlite3-wal";

pub fn legacy_migration_marker_path(data_directory: &Path) -> PathBuf {
    data_directory.join(LEGACY_MIGRATION_MARKER_FILE_NAME)
}

pub fn json_state_backup_path(data_directory: &Path) -> PathBuf {
    data_directory.join(JSON_STATE_BACKUP_FILE_NAME)
}

pub fn json_state_path(data_directory: &Path) -> PathBuf {
    data_directory.join(JSON_STATE_FILE_NAME)
}

pub fn json_state_temp_path(data_directory: &Path) -> PathBuf {
    data_directory.join(JSON_STATE_TEMP_FILE_NAME)
}

pub fn sqlite_shm_path(data_directory: &Path) -> PathBuf {
    data_directory.join(SQLITE_SHM_FILE_NAME)
}

pub fn sqlite_state_path(data_directory: &Path) -> PathBuf {
    data_directory.join(SQLITE_STATE_FILE_NAME)
}

pub fn sqlite_wal_path(data_directory: &Path) -> PathBuf {
    data_directory.join(SQLITE_WAL_FILE_NAME)
}
