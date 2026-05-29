use std::collections::{HashMap, HashSet};
use std::path::Path;

use serde::Serialize;
use serde_json::Value;

use crate::cover_store;

use super::{has_bootstrap_state, load_canonical_state, persist_state_to_directory, sqlite_store};

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StateMaintenanceResult {
    pub changed: bool,
    pub covers_deleted: usize,
    pub sqlite_journal_rows_deleted: usize,
    pub state_repaired: bool,
}

struct CoverPathChange {
    from: String,
    to: String,
}

struct MaintainedState {
    changed: bool,
    references_repaired: bool,
    state: Value,
}

type CoverPathChanges = HashMap<String, CoverPathChange>;
type CoverPathIndex = HashMap<String, String>;

pub fn run_state_maintenance(data_directory: &Path) -> Result<StateMaintenanceResult, String> {
    let maintained_state = maintained_state(data_directory)?;
    let covers_deleted =
        cover_store::remove_orphaned_covers(&maintained_state.state, data_directory)?;
    let sqlite_journal_rows_deleted = sqlite_store::maintain_sqlite_storage(data_directory)?;
    Ok(StateMaintenanceResult {
        changed: maintained_state.changed || covers_deleted > 0 || sqlite_journal_rows_deleted > 0,
        covers_deleted,
        sqlite_journal_rows_deleted,
        state_repaired: maintained_state.references_repaired,
    })
}

fn maintained_state(data_directory: &Path) -> Result<MaintainedState, String> {
    let initial_result = load_canonical_state(data_directory);
    if !has_bootstrap_state(&initial_result.state) {
        return Ok(maintained_state_result(initial_result.state, false, false));
    }
    let normalized_state =
        cover_store::normalize_state_cover_paths(&initial_result.state, data_directory)?;
    let cover_changes = cover_path_changes(&initial_result.state, &normalized_state);
    let latest_result = load_canonical_state(data_directory);
    let mut next_state = latest_result.state;
    let cover_paths_changed = apply_cover_path_changes(&mut next_state, &cover_changes);
    let references_repaired = repair_state_references(&mut next_state);
    let changed = cover_paths_changed || references_repaired;
    if changed {
        persist_state_to_directory(data_directory, &next_state)?;
    }
    Ok(maintained_state_result(
        next_state,
        changed,
        references_repaired,
    ))
}

fn maintained_state_result(
    state: Value,
    changed: bool,
    references_repaired: bool,
) -> MaintainedState {
    MaintainedState {
        changed,
        references_repaired,
        state,
    }
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

fn apply_cover_path_changes(state: &mut Value, changes: &CoverPathChanges) -> bool {
    let Some(books) = state.get_mut("books").and_then(Value::as_array_mut) else {
        return false;
    };
    let mut has_changed = false;
    for book in books {
        has_changed = apply_book_cover_path_change(book, changes) || has_changed;
    }
    has_changed
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

fn repair_state_references(state: &mut Value) -> bool {
    let book_ids = indexed_book_ids(state);
    let repaired_books = repair_book_blockers(state, &book_ids);
    let repaired_blocked_days = repair_blocked_day_books(state, &book_ids);
    repaired_books || repaired_blocked_days
}

fn indexed_book_ids(state: &Value) -> HashSet<String> {
    let Some(books) = state.get("books").and_then(Value::as_array) else {
        return HashSet::new();
    };
    books
        .iter()
        .filter_map(book_id)
        .map(str::to_string)
        .collect()
}

fn repair_book_blockers(state: &mut Value, book_ids: &HashSet<String>) -> bool {
    let Some(books) = state.get_mut("books").and_then(Value::as_array_mut) else {
        return false;
    };
    let mut has_changed = false;
    for book in books {
        has_changed = repair_book_blocker(book, book_ids) || has_changed;
    }
    has_changed
}

fn repair_book_blocker(book: &mut Value, book_ids: &HashSet<String>) -> bool {
    let Some(current_book_id) = book_id(book) else {
        return false;
    };
    let Some(blocker_id) = blocker_id(book) else {
        return false;
    };
    if blocker_id != current_book_id && book_ids.contains(blocker_id) {
        return false;
    }
    set_book_blocker_null(book)
}

fn set_book_blocker_null(book: &mut Value) -> bool {
    let Some(book_object) = book.as_object_mut() else {
        return false;
    };
    book_object.insert("blocked_by".to_string(), Value::Null);
    true
}

fn repair_blocked_day_books(state: &mut Value, book_ids: &HashSet<String>) -> bool {
    let Some(blocked_day_books) = state
        .get_mut("blocked_day_books")
        .and_then(Value::as_object_mut)
    else {
        return false;
    };
    let previous_len = blocked_day_books.len();
    blocked_day_books.retain(|key, _value| blocked_day_book_is_valid(key, book_ids));
    previous_len != blocked_day_books.len()
}

fn blocked_day_book_is_valid(key: &str, book_ids: &HashSet<String>) -> bool {
    let Some((_day_key, book_id)) = key.split_once('|') else {
        return false;
    };
    book_ids.contains(book_id)
}

fn book_id(book: &Value) -> Option<&str> {
    book.get("book_id").and_then(Value::as_str).map(str::trim)
}

fn blocker_id(book: &Value) -> Option<&str> {
    let blocker_id = book.get("blocked_by").and_then(Value::as_str)?;
    let trimmed = blocker_id.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed)
}

fn cover_path(book: &Value) -> Option<&str> {
    let cover_path = book.get("cover_local_path").and_then(Value::as_str)?;
    let trimmed = cover_path.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed)
}
