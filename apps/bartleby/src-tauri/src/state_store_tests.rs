use std::env;
use std::fs;

use serde_json::json;
use uuid::Uuid;

use crate::state_store::paths::{json_state_backup_path, json_state_path, sqlite_state_path};
use crate::state_store::{
    load_canonical_state_for_test, load_legacy_state_for_test, save_state_to_directory,
};

fn temp_state_directory(name: &str) -> std::path::PathBuf {
    env::temp_dir().join(format!("bartleby-{name}-{}", Uuid::new_v4()))
}

#[test]
fn load_canonical_state_migrates_json_primary_and_versions() {
    let data_directory = temp_state_directory("canonical-state");
    fs::create_dir_all(&data_directory).expect("expected state directory");
    fs::write(
        json_state_path(&data_directory),
        serde_json::to_string_pretty(&json!({
            "books": [],
            "settings": { "start_date": "2026-03-01" }
        }))
        .expect("expected json payload"),
    )
    .expect("expected primary json state");
    let load_result = load_canonical_state_for_test(&data_directory);
    assert_eq!(load_result.warning_code, Some("MIGRATED_JSON_TO_SQLITE"));
    assert!(fs::exists(sqlite_state_path(&data_directory)).unwrap_or(false));
    let _ = fs::remove_dir_all(&data_directory);
}

#[test]
fn load_canonical_state_resets_when_artifacts_are_unreadable() {
    let data_directory = temp_state_directory("fresh-reset");
    fs::create_dir_all(&data_directory).expect("expected state directory");
    fs::write(json_state_path(&data_directory), "{broken").expect("expected broken primary");
    fs::write(json_state_backup_path(&data_directory), "{broken").expect("expected broken backup");
    let load_result = load_canonical_state_for_test(&data_directory);
    assert_eq!(load_result.source, "fresh");
    assert_eq!(load_result.warning_code, Some("STATE_RESET_FRESH"));
    let _ = fs::remove_dir_all(&data_directory);
}

#[test]
fn load_legacy_state_migrates_into_canonical_directory() {
    let canonical_directory = temp_state_directory("canonical");
    let legacy_directory = temp_state_directory("legacy");
    fs::create_dir_all(&legacy_directory).expect("expected legacy directory");
    fs::write(
        json_state_path(&legacy_directory),
        serde_json::to_string_pretty(&json!({
            "books": [],
            "settings": { "start_date": "2026-04-01" }
        }))
        .expect("expected legacy json"),
    )
    .expect("expected legacy state write");
    let load_result = load_legacy_state_for_test(&canonical_directory, &legacy_directory)
        .expect("expected legacy migration");
    assert_eq!(load_result.source, "json_primary");
    assert!(fs::exists(sqlite_state_path(&canonical_directory)).unwrap_or(false));
    let _ = fs::remove_dir_all(&canonical_directory);
    let _ = fs::remove_dir_all(&legacy_directory);
}

#[test]
fn save_state_to_directory_reports_success() {
    let data_directory = temp_state_directory("save-result");
    let result = save_state_to_directory(
        &data_directory,
        &json!({ "books": [], "settings": { "start_date": "2026-05-01" } }),
    )
    .expect("expected save result");
    assert_eq!(
        result.get("ok").and_then(serde_json::Value::as_bool),
        Some(true)
    );
    let _ = fs::remove_dir_all(&data_directory);
}
