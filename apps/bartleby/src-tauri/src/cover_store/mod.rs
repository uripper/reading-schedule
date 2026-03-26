use std::fs;
use std::path::{Path, PathBuf};

use reqwest::Client;
use serde_json::Value;
use tauri::AppHandle;
use uuid::Uuid;

use crate::app_paths;

mod data_url;
mod remote;

const COVER_FILE_FALLBACK_PREFIX: &str = "cover";
const EXTENSION_JPG: &str = ".jpg";
const EXTENSION_PNG: &str = ".png";
const EXTENSION_WEBP: &str = ".webp";
const MAX_REMOTE_COVER_REDIRECTS: usize = 5;

struct CoverAsset<'a> {
    bytes: &'a [u8],
    extension: &'a str,
}

pub async fn download_cover(
    app: &AppHandle,
    url: Option<String>,
    book_id: Option<String>,
) -> Result<String, String> {
    let Some(parsed_url) = remote::parsed_http_cover_url(url.as_deref()) else {
        return Ok(String::new());
    };
    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|error| format!("Unable to build cover download client: {error}"))?;
    let Some((_resolved_url, bytes, content_type)) =
        remote::fetch_remote_cover(&client, parsed_url, MAX_REMOTE_COVER_REDIRECTS).await?
    else {
        return Ok(String::new());
    };
    let data_directory = app_paths::canonical_data_directory(app)?;
    let extension =
        remote::extension_for_content_type_and_url(content_type.as_deref(), &_resolved_url);
    persist_cover_bytes(
        &data_directory,
        book_id.as_deref(),
        CoverAsset {
            bytes: &bytes,
            extension,
        },
    )
}

pub fn import_cover(
    app: &AppHandle,
    data_url: Option<String>,
    book_id: Option<String>,
) -> Result<String, String> {
    let Some((bytes, extension)) = data_url::parse_cover_data_url(data_url.as_deref()) else {
        return Ok(String::new());
    };
    let data_directory = app_paths::canonical_data_directory(app)?;
    persist_cover_bytes(
        &data_directory,
        book_id.as_deref(),
        CoverAsset {
            bytes: &bytes,
            extension,
        },
    )
}

pub fn normalize_state_cover_paths(state: &Value, data_directory: &Path) -> Result<Value, String> {
    let Some(state_object) = state.as_object() else {
        return Ok(state.clone());
    };
    let mut next_state = state_object.clone();
    let Some(books_value) = next_state.get_mut("books") else {
        return Ok(Value::Object(next_state));
    };
    let Some(books) = books_value.as_array_mut() else {
        return Ok(Value::Object(next_state));
    };
    for book in books {
        migrate_book_cover_path(book, data_directory)?;
    }
    Ok(Value::Object(next_state))
}

fn detected_cover_extension(path: &Path, bytes: &[u8]) -> Result<&'static str, String> {
    let extension = match path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.trim().to_lowercase())
        .as_deref()
    {
        Some("png") => EXTENSION_PNG,
        Some("webp") => EXTENSION_WEBP,
        Some("jpeg") => EXTENSION_JPG,
        Some("jpg") => EXTENSION_JPG,
        _ if data_url::bytes_match_cover_extension(bytes, EXTENSION_PNG) => EXTENSION_PNG,
        _ if data_url::bytes_match_cover_extension(bytes, EXTENSION_WEBP) => EXTENSION_WEBP,
        _ if data_url::bytes_match_cover_extension(bytes, EXTENSION_JPG) => EXTENSION_JPG,
        _ => {
            return Err("Stored cover asset has an unsupported format.".to_string());
        }
    };
    if !data_url::bytes_match_cover_extension(bytes, extension) {
        return Err("Stored cover asset bytes do not match its file type.".to_string());
    }
    Ok(extension)
}

fn file_system_path_from_cover_source(source: &str) -> Option<PathBuf> {
    if let Some(stripped) = source.strip_prefix("file://") {
        let decoded = urlencoding::decode(stripped).ok()?;
        return Some(PathBuf::from(normalized_file_url_path(decoded.as_ref())));
    }
    Some(PathBuf::from(source))
}

fn migrate_book_cover_path(book: &mut Value, data_directory: &Path) -> Result<(), String> {
    let Some(book_object) = book.as_object_mut() else {
        return Ok(());
    };
    let cover_value = book_object
        .get("cover_local_path")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default();
    if cover_value.is_empty() {
        return Ok(());
    }
    let Some(source_path) = file_system_path_from_cover_source(cover_value) else {
        return Ok(());
    };
    if !source_path.exists() || !source_path.is_file() {
        return Ok(());
    }
    let canonical_cover_directory = app_paths::canonical_cover_directory(data_directory)?;
    let legacy_tauri_cover_directory = app_paths::legacy_tauri_cover_directory(data_directory);
    if source_path.starts_with(&canonical_cover_directory)
        && !source_path.starts_with(&legacy_tauri_cover_directory)
    {
        return Ok(());
    }
    let bytes = fs::read(&source_path)
        .map_err(|error| format!("Unable to read stored cover asset: {error}"))?;
    let extension = detected_cover_extension(&source_path, &bytes)?;
    let destination = migrated_cover_destination(
        data_directory,
        book_object.get("book_id").and_then(Value::as_str),
        extension,
    )?;
    if destination != source_path {
        fs::copy(&source_path, &destination)
            .map_err(|error| format!("Unable to migrate stored cover asset: {error}"))?;
    }
    book_object.insert(
        "cover_local_path".to_string(),
        Value::String(destination.to_string_lossy().into_owned()),
    );
    Ok(())
}

fn migrated_cover_destination(
    data_directory: &Path,
    book_id: Option<&str>,
    extension: &str,
) -> Result<PathBuf, String> {
    let cover_directory = app_paths::canonical_cover_directory(data_directory)?;
    let file_name = format!(
        "{}-{}{}",
        sanitize_file_stem(book_id),
        Uuid::new_v4(),
        extension
    );
    Ok(cover_directory.join(file_name))
}

fn persist_cover_bytes(
    data_directory: &Path,
    book_id: Option<&str>,
    asset: CoverAsset<'_>,
) -> Result<String, String> {
    let file_path = migrated_cover_destination(data_directory, book_id, asset.extension)?;
    fs::write(&file_path, asset.bytes)
        .map_err(|error| format!("Unable to write cover asset: {error}"))?;
    Ok(file_path.to_string_lossy().into_owned())
}

fn safe_file_stem_character(character: char) -> char {
    if character.is_ascii_alphanumeric() || character == '-' || character == '_' {
        return character;
    }
    '_'
}

fn sanitize_file_stem(book_id: Option<&str>) -> String {
    let normalized = String::from(book_id.unwrap_or_default()).trim().to_string();
    let safe = normalized
        .chars()
        .map(safe_file_stem_character)
        .collect::<String>();
    if safe.is_empty() {
        return format!("{COVER_FILE_FALLBACK_PREFIX}-{}", Uuid::new_v4());
    }
    safe
}

fn normalized_file_url_path(path: &str) -> &str {
    let bytes = path.as_bytes();
    if bytes.len() >= 3 && bytes[0] == b'/' && bytes[2] == b':' && bytes[1].is_ascii_alphabetic() {
        return &path[1..];
    }
    path
}
