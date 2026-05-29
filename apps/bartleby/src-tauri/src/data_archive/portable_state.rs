use std::path::Path;

use serde_json::Value;

use crate::{app_paths, state_store};

pub fn prepare_directory_for_export(data_directory: &Path) -> Result<(), String> {
    state_store::run_state_maintenance(data_directory).map(|_| ())
}

pub fn load_imported_state(data_directory: &Path) -> Result<Value, String> {
    state_store::load_imported_state_value_from_directory(data_directory)
}

pub fn repaired_cover_paths(state: &Value, data_directory: &Path) -> Result<Value, String> {
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
    for book in books {
        repair_book_cover_path(book, &canonical_cover_directory);
    }
    Ok(Value::Object(next_state))
}

fn repair_book_cover_path(book: &mut Value, canonical_cover_directory: &Path) {
    let Some(book_object) = book.as_object_mut() else {
        return;
    };
    let Some(current_cover_path) = book_object
        .get("cover_local_path")
        .and_then(Value::as_str)
        .map(str::trim)
    else {
        return;
    };
    if current_cover_path.is_empty() {
        return;
    }
    let Some(file_name) = Path::new(current_cover_path).file_name() else {
        return;
    };
    let candidate = canonical_cover_directory.join(file_name);
    if !candidate.exists()
        || !candidate.is_file()
        || current_cover_path_matches(&candidate, current_cover_path)
    {
        return;
    }
    book_object.insert(
        "cover_local_path".to_string(),
        Value::String(candidate.to_string_lossy().into_owned()),
    );
}

fn current_cover_path_matches(candidate: &Path, current_cover_path: &str) -> bool {
    Path::new(current_cover_path) == candidate
}
