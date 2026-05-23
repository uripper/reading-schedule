use std::env;
use std::fs;
use std::io::Cursor;
use std::path::PathBuf;

use image::{DynamicImage, GenericImageView, ImageBuffer, ImageFormat, Rgb};
use serde_json::{json, Value};
use uuid::Uuid;

use super::normalization::{COVER_MAX_HEIGHT_PX, COVER_MAX_WIDTH_PX, NORMALIZED_COVER_EXTENSION};
use super::{normalize_state_cover_paths, persist_cover_bytes, remove_orphaned_covers, CoverAsset};
use crate::app_paths::canonical_cover_directory;

const FIXTURE_COVER_RGB: [u8; 3] = [24, 96, 140];
const OVERSIZED_MULTIPLIER: u32 = 2;
const SECOND_BOOK_INDEX: usize = 1;

fn temp_cover_directory(name: &str) -> PathBuf {
    env::temp_dir().join(format!("bartleby-cover-{name}-{}", Uuid::new_v4()))
}

fn png_cover_bytes(width: u32, height: u32) -> Vec<u8> {
    let image = DynamicImage::ImageRgb8(ImageBuffer::from_pixel(
        width,
        height,
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

fn second_book_cover_path(state: &Value) -> String {
    state
        .get("books")
        .and_then(Value::as_array)
        .and_then(|books| books.get(SECOND_BOOK_INDEX))
        .and_then(|book| book.get("cover_local_path"))
        .and_then(Value::as_str)
        .expect("expected second cover path")
        .to_string()
}

#[test]
fn persist_cover_bytes_reuses_matching_normalized_cover() {
    let data_directory = temp_cover_directory("dedupe");
    let bytes = png_cover_bytes(COVER_MAX_WIDTH_PX, COVER_MAX_HEIGHT_PX);
    let first_path =
        persist_cover_bytes(&data_directory, Some("first"), CoverAsset { bytes: &bytes })
            .expect("expected first cover write");
    let second_path = persist_cover_bytes(
        &data_directory,
        Some("second"),
        CoverAsset { bytes: &bytes },
    )
    .expect("expected second cover write");
    assert_eq!(first_path, second_path);
    assert!(first_path.ends_with(NORMALIZED_COVER_EXTENSION));
    let _ = fs::remove_dir_all(&data_directory);
}

#[test]
fn persist_cover_bytes_downsizes_oversized_cover() {
    let data_directory = temp_cover_directory("resize");
    let bytes = png_cover_bytes(
        COVER_MAX_WIDTH_PX * OVERSIZED_MULTIPLIER,
        COVER_MAX_HEIGHT_PX * OVERSIZED_MULTIPLIER,
    );
    let cover_path =
        persist_cover_bytes(&data_directory, Some("large"), CoverAsset { bytes: &bytes })
            .expect("expected cover write");
    let stored_bytes = fs::read(cover_path).expect("expected stored cover bytes");
    let stored_image =
        image::load_from_memory(&stored_bytes).expect("expected normalized cover image");
    let (width, height) = stored_image.dimensions();
    assert!(width <= COVER_MAX_WIDTH_PX);
    assert!(height <= COVER_MAX_HEIGHT_PX);
    let _ = fs::remove_dir_all(&data_directory);
}

#[test]
fn normalize_state_cover_paths_collapses_duplicate_canonical_files() {
    let data_directory = temp_cover_directory("state-dedupe");
    let cover_directory =
        canonical_cover_directory(&data_directory).expect("expected cover directory");
    let first_source = cover_directory.join("first-cover.png");
    let second_source = cover_directory.join("second-cover.png");
    let bytes = png_cover_bytes(COVER_MAX_WIDTH_PX, COVER_MAX_HEIGHT_PX);
    fs::write(&first_source, &bytes).expect("expected first source cover");
    fs::write(&second_source, &bytes).expect("expected second source cover");
    let state = json!({
        "books": [
            { "book_id": "first", "cover_local_path": first_source.to_string_lossy() },
            { "book_id": "second", "cover_local_path": second_source.to_string_lossy() }
        ],
        "settings": {}
    });
    let normalized = normalize_state_cover_paths(&state, &data_directory)
        .expect("expected normalized cover state");
    let first_path = first_book_cover_path(&normalized);
    let second_path = second_book_cover_path(&normalized);
    assert_eq!(first_path, second_path);
    assert!(first_path.ends_with(NORMALIZED_COVER_EXTENSION));
    assert!(first_source.exists());
    assert!(second_source.exists());
    assert!(PathBuf::from(first_path).exists());
    let removed_count = remove_orphaned_covers(&normalized, &data_directory)
        .expect("expected orphaned cover cleanup");
    assert_eq!(removed_count, SECOND_BOOK_INDEX + 1);
    assert!(!first_source.exists());
    assert!(!second_source.exists());
    let _ = fs::remove_dir_all(&data_directory);
}
