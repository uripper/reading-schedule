use std::env;
use std::fs;
use std::io::Cursor;

use image::{DynamicImage, ImageBuffer, ImageFormat, Rgb};
use serde_json::Value;
use uuid::Uuid;

use crate::app_paths::canonical_cover_directory;
use crate::data_archive::{export_archive_json_for_test, import_archive_json_for_test};
use crate::state_store::{load_state_value_from_directory, save_state_to_directory};

const FIXTURE_COVER_RGB: [u8; 3] = [24, 96, 140];
const FIXTURE_COVER_SIZE_PX: u32 = 1;

fn temp_archive_directory(name: &str) -> std::path::PathBuf {
    env::temp_dir().join(format!("bartleby-{name}-{}", Uuid::new_v4()))
}

fn png_cover_bytes() -> Vec<u8> {
    let image = DynamicImage::ImageRgb8(ImageBuffer::from_pixel(
        FIXTURE_COVER_SIZE_PX,
        FIXTURE_COVER_SIZE_PX,
        Rgb(FIXTURE_COVER_RGB),
    ));
    let mut bytes = Cursor::new(Vec::new());
    image
        .write_to(&mut bytes, ImageFormat::Png)
        .expect("expected png cover encoding");
    bytes.into_inner()
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
    fs::write(cover_directory.join("cover-a.png"), png_cover_bytes()).expect("expected cover file");
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
    let payload_json =
        export_archive_json_for_test(&data_directory).expect("expected archive export json");
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
    assert!(payload["files"]
        .as_array()
        .unwrap_or(&Vec::new())
        .iter()
        .any(|value| {
            value["path"].as_str().is_some_and(|path| {
                path.starts_with("book_covers/cover-") && path.ends_with(".jpg")
            })
        }));
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
    fs::write(
        source_cover_directory.join("cover-a.png"),
        png_cover_bytes(),
    )
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
            "last_result": {
                "created_at": "2026-06-01T12:00:00Z",
                "schedule": [
                    {
                        "book_id": "book-1",
                        "date": "2026-06-01",
                        "minutes": 20,
                        "session_index": 0,
                        "title": "Imported Book",
                        "words_planned": 100
                    }
                ],
                "summary": null
            },
            "schedule_completions": {
                "2026-06-01|book-1|000": true
            },
            "sessions": [
                {
                    "book_id": "book-1",
                    "date": "2026-06-01",
                    "minutes": 20,
                    "session_index": 0
                }
            ],
            "settings": { "start_date": "2026-06-01" }
        }),
    )
    .expect("expected source state save");
    let payload_json =
        export_archive_json_for_test(&source_directory).expect("expected archive export json");

    let target_directory = temp_archive_directory("archive-target");
    fs::create_dir_all(&target_directory).expect("expected target directory");
    fs::write(target_directory.join("stale.txt"), "stale").expect("expected stale file");
    let import_result = import_archive_json_for_test(&target_directory, &payload_json)
        .expect("expected archive import");
    assert_eq!(import_result.directories_restored, 1);
    assert_eq!(import_result.files_restored, 2);
    assert_eq!(import_result.books_restored, 1);
    assert_eq!(import_result.schedule_rows_restored, 1);
    assert_eq!(import_result.sessions_restored, 1);
    assert_eq!(import_result.completion_entries_restored, 1);
    let imported_state = load_state_value_from_directory(&target_directory);
    let imported_cover_path = first_book_cover_path(&imported_state);
    let target_path_prefix = target_directory.to_string_lossy().into_owned();
    assert!(imported_cover_path.starts_with(&target_path_prefix));
    assert!(std::path::PathBuf::from(imported_cover_path).is_file());
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
fn import_archive_json_rejects_missing_state_file() {
    let data_directory = temp_archive_directory("archive-missing-state");
    fs::create_dir_all(&data_directory).expect("expected data directory");
    let payload_json = r#"{
        "createdAt": "2026-05-22T00:00:00Z",
        "directories": [],
        "files": [],
        "formatVersion": 1
    }"#;
    let error = import_archive_json_for_test(&data_directory, payload_json)
        .expect_err("expected archive import without state to fail");
    assert!(error.contains("planner_state.json"));
    let _ = fs::remove_dir_all(&data_directory);
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
fn import_archive_json_rejects_empty_state_snapshot() {
    let data_directory = temp_archive_directory("archive-empty-state");
    fs::create_dir_all(&data_directory).expect("expected data directory");
    let payload_json = r#"{
        "createdAt": "2026-05-22T00:00:00Z",
        "directories": [],
        "files": [
            {
                "bytesBase64": "bnVsbA==",
                "path": "planner_state.json"
            }
        ],
        "formatVersion": 1
    }"#;
    let error = import_archive_json_for_test(&data_directory, payload_json)
        .expect_err("expected empty state import to fail");
    assert!(error.contains("missing books or settings"));
    let _ = fs::remove_dir_all(&data_directory);
}

#[test]
fn import_archive_json_rewrites_cover_paths_for_new_directory() {
    let source_directory = temp_archive_directory("archive-portable-source");
    let source_cover_directory =
        canonical_cover_directory(&source_directory).expect("expected source cover directory");
    let source_cover_path = source_cover_directory.join("cover-a.png");
    fs::write(&source_cover_path, png_cover_bytes()).expect("expected source cover file");
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
    let payload_json =
        export_archive_json_for_test(&source_directory).expect("expected archive export json");

    let target_directory = temp_archive_directory("archive-portable-target");
    let import_result = import_archive_json_for_test(&target_directory, &payload_json)
        .expect("expected portable archive import");
    assert_eq!(import_result.directories_restored, 1);
    assert_eq!(import_result.books_restored, 1);
    let imported_state = load_state_value_from_directory(&target_directory);
    let imported_cover_path = first_book_cover_path(&imported_state);
    let target_path_prefix = target_directory.to_string_lossy().into_owned();
    assert!(imported_cover_path.starts_with(&target_path_prefix));
    assert!(std::path::PathBuf::from(imported_cover_path).is_file());

    let _ = fs::remove_dir_all(&source_directory);
    let _ = fs::remove_dir_all(&target_directory);
}
