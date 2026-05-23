use std::env;
use std::fs;

use serde_json::Value;
use uuid::Uuid;

use crate::data_archive::{
    export_archive_json_for_test, import_archive_json_for_test,
};
use crate::app_paths::canonical_cover_directory;
use crate::state_store::{load_state_value_from_directory, save_state_to_directory};

fn temp_archive_directory(name: &str) -> std::path::PathBuf {
    env::temp_dir().join(format!("bartleby-{name}-{}", Uuid::new_v4()))
}

fn first_book_cover_path(state: &Value) -> String {
    state
        .get("books")
        .and_then(Value::as_array)
        .and_then(|books| books.first())
        .and_then(|book| book.get("cover_local_path"))
        .and_then(Value::as_str)
        .expect("expected first cover path")
        .to_string()
}

#[test]
fn export_archive_json_includes_files_and_directories() {
    let data_directory = temp_archive_directory("archive-export");
    let cover_directory =
        canonical_cover_directory(&data_directory).expect("expected cover directory");
    fs::write(cover_directory.join("cover-a.png"), "cover")
        .expect("expected cover file");
    save_state_to_directory(
        &data_directory,
        &serde_json::json!({
            "books": [
                {
                    "book_id": "book-1",
                    "cover_local_path": cover_directory.join("cover-a.png").to_string_lossy().into_owned()
                }
            ],
            "settings": { "start_date": "2026-05-22" }
        }),
    )
    .expect("expected state save");
    let payload_json = export_archive_json_for_test(&data_directory)
        .expect("expected archive export json");
    let payload = serde_json::from_str::<Value>(&payload_json).expect("expected export payload");
    assert_eq!(payload["formatVersion"], 1);
    assert!(payload["directories"]
        .as_array()
        .unwrap_or(&Vec::new())
        .iter()
        .any(|value| value.as_str() == Some("book_covers")));
    assert!(payload["files"]
        .as_array()
        .unwrap_or(&Vec::new())
        .iter()
        .any(|value| value["path"].as_str() == Some("planner_state.json")));
    assert!(!payload["files"]
        .as_array()
        .unwrap_or(&Vec::new())
        .iter()
        .any(|value| value["path"].as_str() == Some("planner_state.sqlite3")));
    let _ = fs::remove_dir_all(&data_directory);
}

#[test]
fn import_archive_json_replaces_existing_data() {
    let source_directory = temp_archive_directory("archive-source");
    let source_cover_directory =
        canonical_cover_directory(&source_directory).expect("expected source cover directory");
    fs::write(source_cover_directory.join("cover-a.png"), "cover-v2")
        .expect("expected source cover file");
    save_state_to_directory(
        &source_directory,
        &serde_json::json!({
            "books": [
                {
                    "book_id": "book-1",
                    "cover_local_path": source_cover_directory.join("cover-a.png").to_string_lossy().into_owned()
                }
            ],
            "settings": { "start_date": "2026-06-01" }
        }),
    )
    .expect("expected source state save");
    let payload_json = export_archive_json_for_test(&source_directory)
        .expect("expected archive export json");

    let target_directory = temp_archive_directory("archive-target");
    fs::create_dir_all(&target_directory).expect("expected target directory");
    fs::write(target_directory.join("stale.txt"), "stale")
        .expect("expected stale file");
    let import_result = import_archive_json_for_test(&target_directory, &payload_json)
        .expect("expected archive import");
    assert_eq!(import_result.directories_restored, 1);
    assert_eq!(import_result.files_restored, 2);
    assert_eq!(
        fs::read_to_string(target_directory.join("book_covers").join("cover-a.png"))
            .expect("expected imported cover"),
        "cover-v2"
    );
    let imported_state = load_state_value_from_directory(&target_directory);
    assert_eq!(
        imported_state
            .get("settings")
            .and_then(|settings| settings.get("start_date"))
            .and_then(Value::as_str),
        Some("2026-06-01")
    );
    let _ = fs::remove_dir_all(&source_directory);
    let _ = fs::remove_dir_all(&target_directory);
}

#[test]
fn import_archive_json_rejects_parent_directory_paths() {
    let data_directory = temp_archive_directory("archive-invalid");
    fs::create_dir_all(&data_directory).expect("expected data directory");
    let payload_json = r#"{
        "createdAt": "2026-05-22T00:00:00Z",
        "directories": [],
        "files": [
            {
                "bytesBase64": "Y29uZmln",
                "path": "../outside.txt"
            }
        ],
        "formatVersion": 1
    }"#;
    let error = import_archive_json_for_test(&data_directory, payload_json)
        .expect_err("expected invalid archive import to fail");
    assert!(error.contains("invalid"));
    let _ = fs::remove_dir_all(&data_directory);
}

#[test]
fn import_archive_json_rewrites_cover_paths_for_new_directory() {
    let source_directory = temp_archive_directory("archive-portable-source");
    let source_cover_directory =
        canonical_cover_directory(&source_directory).expect("expected source cover directory");
    let cover_file_name = format!("cover-{}.jpg", "a".repeat(64));
    let source_cover_path = source_cover_directory.join(&cover_file_name);
    fs::write(&source_cover_path, "cover-v1").expect("expected source cover file");
    save_state_to_directory(
        &source_directory,
        &serde_json::json!({
            "books": [
                {
                    "book_id": "book-1",
                    "cover_local_path": source_cover_path.to_string_lossy().into_owned()
                }
            ],
            "settings": { "start_date": "2026-05-22" }
        }),
    )
    .expect("expected source state write");
    let payload_json = export_archive_json_for_test(&source_directory)
        .expect("expected archive export json");

    let target_directory = temp_archive_directory("archive-portable-target");
    let import_result = import_archive_json_for_test(&target_directory, &payload_json)
        .expect("expected portable archive import");
    assert_eq!(import_result.directories_restored, 1);
    let target_cover_directory =
        canonical_cover_directory(&target_directory).expect("expected target cover directory");
    let target_cover_path = target_cover_directory.join(&cover_file_name);
    assert!(target_cover_path.exists());
    let imported_state = load_state_value_from_directory(&target_directory);
    assert_eq!(first_book_cover_path(&imported_state), target_cover_path.to_string_lossy());

    let _ = fs::remove_dir_all(&source_directory);
    let _ = fs::remove_dir_all(&target_directory);
}