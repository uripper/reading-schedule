use std::collections::HashMap;
use std::path::Path;

use serde::Serialize;
use serde_json::Value;

use crate::cover_store;

use super::{has_bootstrap_state, load_canonical_state, persist_state_to_directory};

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverNormalizationResult {
    pub changed: bool,
}

struct CoverPathChange {
    from: String,
    to: String,
}

type CoverPathChanges = HashMap<String, CoverPathChange>;
type CoverPathIndex = HashMap<String, String>;

pub fn normalize_cover_state_to_directory(
    data_directory: &Path,
) -> Result<CoverNormalizationResult, String> {
    let initial_result = load_canonical_state(data_directory);
    if !has_bootstrap_state(&initial_result.state) {
        return Ok(normalization_result(false));
    }
    let normalized_state =
        cover_store::normalize_state_cover_paths(&initial_result.state, data_directory)?;
    let cover_changes = cover_path_changes(&initial_result.state, &normalized_state);
    if cover_changes.is_empty() {
        return Ok(normalization_result(false));
    }
    let latest_result = load_canonical_state(data_directory);
    let Some(next_state) = state_with_cover_path_changes(latest_result.state, &cover_changes)
    else {
        return Ok(normalization_result(false));
    };
    persist_state_to_directory(data_directory, &next_state)?;
    Ok(normalization_result(true))
}

fn normalization_result(changed: bool) -> CoverNormalizationResult {
    CoverNormalizationResult { changed }
}

fn cover_path_changes(initial_state: &Value, normalized_state: &Value) -> CoverPathChanges {
    let initial_paths = indexed_cover_paths(initial_state);
    let normalized_paths = indexed_cover_paths(normalized_state);
    let mut changes = HashMap::new();
    for (book_id, initial_path) in initial_paths {
        let normalized_path = normalized_paths.get(&book_id);
        append_cover_path_change(
            &mut changes,
            cover_path_change(book_id, initial_path, normalized_path),
        );
    }
    changes
}

fn append_cover_path_change(
    changes: &mut CoverPathChanges,
    cover_path_change: Option<(String, CoverPathChange)>,
) {
    let Some((book_id, cover_path_change)) = cover_path_change else {
        return;
    };
    changes.insert(book_id, cover_path_change);
}

fn cover_path_change(
    book_id: String,
    initial_path: String,
    normalized_path: Option<&String>,
) -> Option<(String, CoverPathChange)> {
    let normalized_path = normalized_path?;
    if normalized_path == &initial_path {
        return None;
    }
    Some((
        book_id,
        CoverPathChange {
            from: initial_path,
            to: normalized_path.clone(),
        },
    ))
}

fn indexed_cover_paths(state: &Value) -> CoverPathIndex {
    let Some(books) = state.get("books").and_then(Value::as_array) else {
        return HashMap::new();
    };
    let mut paths = HashMap::new();
    for book in books {
        append_indexed_cover_path(&mut paths, book);
    }
    paths
}

fn append_indexed_cover_path(paths: &mut CoverPathIndex, book: &Value) {
    let Some(book_id) = book_id(book) else {
        return;
    };
    let Some(cover_path) = cover_path(book) else {
        return;
    };
    paths.insert(book_id.to_string(), cover_path.to_string());
}

fn state_with_cover_path_changes(mut state: Value, changes: &CoverPathChanges) -> Option<Value> {
    let books = state.get_mut("books").and_then(Value::as_array_mut)?;
    let changed = books.iter_mut().fold(false, |has_changed, book| {
        apply_book_cover_path_change(book, changes) || has_changed
    });
    if !changed {
        return None;
    }
    Some(state)
}

fn apply_book_cover_path_change(book: &mut Value, changes: &CoverPathChanges) -> bool {
    let Some(book_id) = book_id(book) else {
        return false;
    };
    let Some(change) = changes.get(book_id) else {
        return false;
    };
    if cover_path(book) != Some(change.from.as_str()) {
        return false;
    }
    let Some(book_object) = book.as_object_mut() else {
        return false;
    };
    book_object.insert(
        "cover_local_path".to_string(),
        Value::String(change.to.clone()),
    );
    true
}

fn book_id(book: &Value) -> Option<&str> {
    book.get("book_id").and_then(Value::as_str).map(str::trim)
}

fn cover_path(book: &Value) -> Option<&str> {
    let cover_path = book.get("cover_local_path").and_then(Value::as_str)?;
    let trimmed = cover_path.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed)
}
