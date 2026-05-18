use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

use reqwest::Client;
use serde_json::Value;
use tauri::AppHandle;

use crate::app_paths;

mod data_url;
mod normalization;
mod remote;
#[cfg(test)]
mod tests;

const COVER_FILE_PREFIX: &str = "cover";
const COVER_FILE_NAME_PREFIX: &str = "cover-";
const EXTENSION_JPG: &str = ".jpg";
const EXTENSION_PNG: &str = ".png";
const EXTENSION_WEBP: &str = ".webp";
const SHA256_HEX_LENGTH: usize = 64;
const MAX_REMOTE_COVER_REDIRECTS: usize = 5;

struct CoverAsset<'a> {
    bytes: &'a [u8],
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
    let Some((_resolved_url, bytes, _content_type)) =
        remote::fetch_remote_cover(&client, parsed_url, MAX_REMOTE_COVER_REDIRECTS).await?
    else {
        return Ok(String::new());
    };
    let data_directory = app_paths::canonical_data_directory(app)?;
    persist_cover_bytes(
        &data_directory,
        book_id.as_deref(),
        CoverAsset { bytes: &bytes },
    )
}

pub fn import_cover(
    app: &AppHandle,
    data_url: Option<String>,
    book_id: Option<String>,
) -> Result<String, String> {
    let Some((bytes, _extension)) = data_url::parse_cover_data_url(data_url.as_deref()) else {
        return Ok(String::new());
    };
    let data_directory = app_paths::canonical_data_directory(app)?;
    persist_cover_bytes(
        &data_directory,
        book_id.as_deref(),
        CoverAsset { bytes: &bytes },
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
    let canonical_cover_directory = app_paths::canonical_cover_directory(data_directory)?;
    for book in books.iter_mut() {
        migrate_book_cover_path(book, data_directory, &canonical_cover_directory)?;
    }
    Ok(Value::Object(next_state))
}

pub fn remove_orphaned_covers(state: &Value, data_directory: &Path) -> Result<usize, String> {
    let canonical_cover_directory = app_paths::canonical_cover_directory(data_directory)?;
    let referenced_paths = referenced_cover_paths_from_state(state);
    let entries = fs::read_dir(&canonical_cover_directory)
        .map_err(|error| format!("Unable to inspect cover assets: {error}"))?;
    let mut removed_count = 0;
    for entry in entries {
        let path = entry
            .map_err(|error| format!("Unable to inspect cover asset: {error}"))?
            .path();
        if !should_remove_orphaned_cover(&path, &referenced_paths, &canonical_cover_directory) {
            continue;
        }
        fs::remove_file(path)
            .map_err(|error| format!("Unable to remove orphaned cover asset: {error}"))?;
        removed_count += 1;
    }
    Ok(removed_count)
}

fn detected_cover_extension(path: &Path, bytes: &[u8]) -> Result<&'static str, String> {
    if data_url::bytes_match_cover_extension(bytes, EXTENSION_PNG) {
        return Ok(EXTENSION_PNG);
    }
    if data_url::bytes_match_cover_extension(bytes, EXTENSION_WEBP) {
        return Ok(EXTENSION_WEBP);
    }
    if data_url::bytes_match_cover_extension(bytes, EXTENSION_JPG) {
        return Ok(EXTENSION_JPG);
    }

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
    Ok(extension)
}

fn file_system_path_from_cover_source(source: &str) -> Option<PathBuf> {
    if let Some(stripped) = source.strip_prefix("file://") {
        let decoded = urlencoding::decode(stripped).ok()?;
        return Some(PathBuf::from(normalized_file_url_path(decoded.as_ref())));
    }
    if let Some(url_path) = decoded_url_path(source) {
        return Some(PathBuf::from(normalized_file_url_path(&url_path)));
    }
    Some(PathBuf::from(source))
}

fn migrate_book_cover_path(
    book: &mut Value,
    data_directory: &Path,
    canonical_cover_directory: &Path,
) -> Result<Option<PathBuf>, String> {
    let Some(book_object) = book.as_object_mut() else {
        return Ok(None);
    };
    let cover_value = book_object
        .get("cover_local_path")
        .and_then(Value::as_str)
        .map(str::trim)
        .unwrap_or_default();
    if cover_value.is_empty() {
        return Ok(None);
    }
    let Some(source_path) = file_system_path_from_cover_source(cover_value) else {
        return Ok(None);
    };
    if !source_path.exists() || !source_path.is_file() {
        return Ok(None);
    }
    if is_normalized_canonical_cover_path(&source_path, canonical_cover_directory) {
        return Ok(None);
    }
    let bytes = fs::read(&source_path)
        .map_err(|error| format!("Unable to read stored cover asset: {error}"))?;
    detected_cover_extension(&source_path, &bytes)?;
    let normalized = normalization::normalize_cover_bytes(&bytes)?;
    let destination = normalized_cover_destination(data_directory, &normalized.hash)?;
    if !destination.exists() {
        fs::write(&destination, normalized.bytes)
            .map_err(|error| format!("Unable to migrate stored cover asset: {error}"))?;
    }
    book_object.insert(
        "cover_local_path".to_string(),
        Value::String(destination.to_string_lossy().into_owned()),
    );
    if source_path == destination || !source_path.starts_with(canonical_cover_directory) {
        return Ok(None);
    }
    Ok(Some(source_path))
}

fn normalized_cover_destination(data_directory: &Path, hash: &str) -> Result<PathBuf, String> {
    let cover_directory = app_paths::canonical_cover_directory(data_directory)?;
    let file_name = format!(
        "{COVER_FILE_PREFIX}-{hash}{}",
        normalization::NORMALIZED_COVER_EXTENSION
    );
    Ok(cover_directory.join(file_name))
}

fn persist_cover_bytes(
    data_directory: &Path,
    _book_id: Option<&str>,
    asset: CoverAsset<'_>,
) -> Result<String, String> {
    let normalized = normalization::normalize_cover_bytes(asset.bytes)?;
    let file_path = normalized_cover_destination(data_directory, &normalized.hash)?;
    if !file_path.exists() {
        fs::write(&file_path, normalized.bytes)
            .map_err(|error| format!("Unable to write cover asset: {error}"))?;
    }
    Ok(file_path.to_string_lossy().into_owned())
}

fn is_normalized_canonical_cover_path(path: &Path, canonical_cover_directory: &Path) -> bool {
    if !path.starts_with(canonical_cover_directory) {
        return false;
    }
    if path.extension().and_then(|value| value.to_str()) != Some("jpg") {
        return false;
    }
    path.file_stem()
        .and_then(|value| value.to_str())
        .and_then(|value| value.strip_prefix(COVER_FILE_NAME_PREFIX))
        .is_some_and(is_sha256_hex)
}

fn is_sha256_hex(value: &str) -> bool {
    value.len() == SHA256_HEX_LENGTH && value.as_bytes().iter().all(u8::is_ascii_hexdigit)
}

fn referenced_cover_paths(books: &[Value]) -> HashSet<PathBuf> {
    books
        .iter()
        .filter_map(|book| book.get("cover_local_path"))
        .filter_map(Value::as_str)
        .filter_map(file_system_path_from_cover_source)
        .collect()
}

fn referenced_cover_paths_from_state(state: &Value) -> HashSet<PathBuf> {
    let Some(books) = state.get("books").and_then(Value::as_array) else {
        return HashSet::new();
    };
    referenced_cover_paths(books)
}

fn should_remove_orphaned_cover(
    cover_path: &Path,
    referenced_paths: &HashSet<PathBuf>,
    canonical_cover_directory: &Path,
) -> bool {
    cover_path.is_file()
        && cover_path.starts_with(canonical_cover_directory)
        && has_cover_file_extension(cover_path)
        && !referenced_paths.contains(cover_path)
}

fn has_cover_file_extension(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|value| value.to_str())
            .map(|value| value.trim().to_lowercase())
            .as_deref(),
        Some("jpg" | "jpeg" | "png" | "webp")
    )
}

fn decoded_url_path(source: &str) -> Option<String> {
    let (_scheme, rest) = source.split_once("://")?;
    let path_start = rest.find('/')?;
    let decoded = urlencoding::decode(&rest[path_start..]).ok()?;
    Some(normalized_url_path(decoded.as_ref()).to_string())
}

fn normalized_url_path(path: &str) -> &str {
    if path.starts_with("//") && !windows_drive_path_after_slash(path) {
        return &path[1..];
    }
    path
}

fn windows_drive_path_after_slash(path: &str) -> bool {
    let bytes = path.as_bytes();
    bytes.len() >= 4 && bytes[0] == b'/' && bytes[2] == b':' && bytes[1].is_ascii_alphabetic()
}

fn normalized_file_url_path(path: &str) -> &str {
    let bytes = path.as_bytes();
    if bytes.len() >= 3 && bytes[0] == b'/' && bytes[2] == b':' && bytes[1].is_ascii_alphabetic() {
        return &path[1..];
    }
    path
}
