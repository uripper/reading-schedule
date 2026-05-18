use std::env;
use std::fs;
use std::io::Cursor;

use image::{DynamicImage, ImageBuffer, ImageFormat, Rgb};
use serde_json::json;
use uuid::Uuid;

use crate::state_store::load_preferred_state_for_test;
use crate::state_store::paths::json_state_path;

const FIXTURE_COVER_RGB: [u8; 3] = [24, 96, 140];
const FIXTURE_COVER_SIZE_PX: u32 = 1;

fn temp_state_directory(name: &str) -> std::path::PathBuf {
    env::temp_dir().join(format!("bartleby-{name}-{}", Uuid::new_v4()))
}

fn legacy_png_cover_bytes() -> Vec<u8> {
    let image = DynamicImage::ImageRgb8(ImageBuffer::from_pixel(
        FIXTURE_COVER_SIZE_PX,
        FIXTURE_COVER_SIZE_PX,
        Rgb(FIXTURE_COVER_RGB),
    ));
    let mut bytes = Cursor::new(Vec::new());
    image
        .write_to(&mut bytes, ImageFormat::Png)
        .expect("expected valid png cover fixture");
    bytes.into_inner()
}

#[test]
fn load_preferred_state_tolerates_legacy_cover_extension_mismatch() {
    let canonical_directory = temp_state_directory("preferred-cover-mismatch-canonical");
    let legacy_directory = temp_state_directory("preferred-cover-mismatch-legacy");
    fs::create_dir_all(&legacy_directory).expect("expected legacy directory");
    let legacy_cover_path = legacy_directory.join("legacy-cover.jpg");
    fs::write(&legacy_cover_path, legacy_png_cover_bytes()).expect("expected legacy cover file");
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
    assert!(migrated_cover_path.ends_with(".jpg"));
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
