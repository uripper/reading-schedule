use std::env;
use std::fs;

use serde_json::json;
use uuid::Uuid;

use crate::state_store::paths::{json_state_backup_path, json_state_path, sqlite_state_path};
use crate::state_store::{
    load_canonical_state_for_test, load_legacy_state_for_test, load_preferred_state_for_test,
    save_state_to_directory,
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
fn load_preferred_state_uses_legacy_before_canonical() {
    let canonical_directory = temp_state_directory("preferred-canonical");
    let legacy_directory = temp_state_directory("preferred-legacy");
    fs::create_dir_all(&canonical_directory).expect("expected canonical directory");
    fs::create_dir_all(&legacy_directory).expect("expected legacy directory");
    fs::write(
        json_state_path(&canonical_directory),
        serde_json::to_string_pretty(&json!({
            "books": [],
            "settings": { "start_date": "2026-05-01" }
        }))
        .expect("expected canonical json"),
    )
    .expect("expected canonical state write");
    fs::write(
        json_state_path(&legacy_directory),
        serde_json::to_string_pretty(&json!({
            "books": [],
            "settings": { "start_date": "2026-04-01" }
        }))
        .expect("expected legacy json"),
    )
    .expect("expected legacy state write");
    let load_result = load_preferred_state_for_test(
        &canonical_directory,
        std::slice::from_ref(&legacy_directory),
    )
    .expect("expected preferred state load");
    assert_eq!(load_result.source, "json_primary");
    assert_eq!(
        load_result.source_path,
        json_state_path(&legacy_directory)
            .to_string_lossy()
            .into_owned()
    );
    assert_eq!(
        load_result
            .state
            .get("settings")
            .and_then(|settings| settings.get("start_date"))
            .and_then(serde_json::Value::as_str),
        Some("2026-04-01"),
    );
    let _ = fs::remove_dir_all(&canonical_directory);
    let _ = fs::remove_dir_all(&legacy_directory);
}

#[test]
fn load_preferred_state_uses_legacy_sqlite_before_canonical() {
    let canonical_directory = temp_state_directory("preferred-canonical-sqlite");
    let legacy_directory = temp_state_directory("preferred-legacy-sqlite");
    save_state_to_directory(
        &canonical_directory,
        &json!({
            "books": [],
            "settings": { "start_date": "2026-05-01" }
        }),
    )
    .expect("expected canonical sqlite state write");
    save_state_to_directory(
        &legacy_directory,
        &json!({
            "books": [],
            "settings": { "start_date": "2026-04-01" },
            "last_result": { "schedule": [] }
        }),
    )
    .expect("expected legacy sqlite state write");
    let load_result = load_preferred_state_for_test(
        &canonical_directory,
        std::slice::from_ref(&legacy_directory),
    )
    .expect("expected preferred state load");
    assert_eq!(load_result.source, "sqlite");
    assert_eq!(
        load_result.source_path,
        sqlite_state_path(&legacy_directory)
            .to_string_lossy()
            .into_owned()
    );
    assert_eq!(
        load_result
            .state
            .get("settings")
            .and_then(|settings| settings.get("start_date"))
            .and_then(serde_json::Value::as_str),
        Some("2026-04-01"),
    );
    let _ = fs::remove_dir_all(&canonical_directory);
    let _ = fs::remove_dir_all(&legacy_directory);
}

#[test]
fn load_preferred_state_uses_legacy_json_when_sqlite_fails() {
    let canonical_directory = temp_state_directory("preferred-canonical-json-fallback");
    let legacy_directory = temp_state_directory("preferred-legacy-json-fallback");
    fs::create_dir_all(&legacy_directory).expect("expected legacy directory");
    fs::write(
        sqlite_state_path(&legacy_directory),
        "not a sqlite database",
    )
    .expect("expected broken sqlite state write");
    fs::write(
        json_state_path(&legacy_directory),
        serde_json::to_string_pretty(&json!({
            "books": [],
            "settings": { "start_date": "2026-04-02" },
            "last_result": { "schedule": [] }
        }))
        .expect("expected legacy json"),
    )
    .expect("expected legacy json state write");
    let load_result = load_preferred_state_for_test(
        &canonical_directory,
        std::slice::from_ref(&legacy_directory),
    )
    .expect("expected preferred state load");
    assert_eq!(load_result.source, "json_primary");
    assert!(load_result
        .warning_message
        .as_deref()
        .unwrap_or_default()
        .contains("loaded JSON fallback"));
    assert_eq!(
        load_result
            .state
            .get("settings")
            .and_then(|settings| settings.get("start_date"))
            .and_then(serde_json::Value::as_str),
        Some("2026-04-02"),
    );
    let _ = fs::remove_dir_all(&canonical_directory);
    let _ = fs::remove_dir_all(&legacy_directory);
}

#[test]
fn load_preferred_state_tolerates_legacy_cover_extension_mismatch() {
    let canonical_directory = temp_state_directory("preferred-cover-mismatch-canonical");
    let legacy_directory = temp_state_directory("preferred-cover-mismatch-legacy");
    fs::create_dir_all(&legacy_directory).expect("expected legacy directory");
    let legacy_cover_path = legacy_directory.join("legacy-cover.jpg");
    fs::write(
        &legacy_cover_path,
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    )
    .expect("expected legacy cover file");
    fs::write(
        json_state_path(&legacy_directory),
        serde_json::to_string_pretty(&json!({
            "books": [
                {
                    "book_id": "book-1",
                    "cover_local_path": legacy_cover_path.to_string_lossy().into_owned()
                }
            ],
            "settings": { "start_date": "2026-04-03" }
        }))
        .expect("expected legacy json"),
    )
    .expect("expected legacy json state write");
    let load_result = load_preferred_state_for_test(
        &canonical_directory,
        std::slice::from_ref(&legacy_directory),
    )
    .expect("expected preferred state load");
    assert_eq!(load_result.source, "json_primary");
    assert!(!load_result
        .warning_message
        .as_deref()
        .unwrap_or_default()
        .contains("skipped cover migration"));
    let migrated_cover_path = load_result
        .state
        .get("books")
        .and_then(serde_json::Value::as_array)
        .and_then(|books| books.first())
        .and_then(|book| book.get("cover_local_path"))
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default()
        .to_string();
    assert!(migrated_cover_path.ends_with(".png"));
    assert!(fs::exists(std::path::Path::new(&migrated_cover_path)).unwrap_or(false));
    assert_eq!(
        load_result
            .state
            .get("settings")
            .and_then(|settings| settings.get("start_date"))
            .and_then(serde_json::Value::as_str),
        Some("2026-04-03"),
    );
    let _ = fs::remove_dir_all(&canonical_directory);
    let _ = fs::remove_dir_all(&legacy_directory);
}

#[test]
fn load_preferred_state_reports_checked_legacy_paths_when_fresh() {
    let canonical_directory = temp_state_directory("preferred-fresh");
    let legacy_directory = temp_state_directory("missing-legacy");
    let load_result = load_preferred_state_for_test(
        &canonical_directory,
        std::slice::from_ref(&legacy_directory),
    )
    .expect("expected preferred state load");
    let legacy_path = legacy_directory.to_string_lossy();
    assert_eq!(load_result.source, "fresh");
    assert!(load_result
        .warning_message
        .as_deref()
        .unwrap_or_default()
        .contains(legacy_path.as_ref()));
    let _ = fs::remove_dir_all(&canonical_directory);
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
