//! Schedule and manual-exclusion bookkeeping for book transfers.
use std::collections::HashSet;

use serde_json::{Map, Value};

const COMPLETION_KEY_SEPARATOR: char = '|';

/// Drops uncompleted rows of moved books from `today` onward and returns how many.
pub fn remove_future_rows(snapshot: &mut Value, moving: &HashSet<String>, today: &str) -> usize {
    let completions = snapshot
        .get("schedule_completions")
        .and_then(Value::as_object)
        .cloned()
        .unwrap_or_default();
    let Some(rows) = snapshot
        .pointer_mut("/last_result/schedule")
        .and_then(Value::as_array_mut)
    else {
        return 0;
    };
    let filter = ObsoleteRowFilter {
        completions: &completions,
        moving,
        today,
    };
    let previous_len = rows.len();
    rows.retain(|row| !is_obsolete(&filter, row));
    previous_len - rows.len()
}

/// Selects uncompleted rows of moved books dated today or later.
struct ObsoleteRowFilter<'a> {
    completions: &'a Map<String, Value>,
    moving: &'a HashSet<String>,
    today: &'a str,
}

fn is_obsolete(filter: &ObsoleteRowFilter<'_>, row: &Value) -> bool {
    let book_id = text(row, "book_id");
    let date = text(row, "date");
    if !filter.moving.contains(&book_id) || date.as_str() < filter.today {
        return false;
    }
    !row_is_completed(row, filter.completions)
}

/// Mirrors the renderer's exact and day-book completion keys.
pub fn row_is_completed(row: &Value, completions: &Map<String, Value>) -> bool {
    let date = text(row, "date");
    let book_id = text(row, "book_id");
    let exact_key = format!("{date}|{}|{book_id}", text(row, "session_index"));
    let day_key = format!("{date}|{book_id}");
    [exact_key, day_key]
        .iter()
        .any(|key| completions.get(key).and_then(Value::as_bool) == Some(true))
}

/// Removes future manual exclusions of moved books so they can follow the books.
pub fn take_future_exclusions(
    snapshot: &mut Value,
    moving: &HashSet<String>,
    today: &str,
) -> Map<String, Value> {
    let Some(exclusions) = snapshot
        .get_mut("blocked_day_books")
        .and_then(Value::as_object_mut)
    else {
        return Map::new();
    };
    let moved_keys: Vec<String> = exclusions
        .keys()
        .filter(|key| exclusion_moves(key, moving, today))
        .cloned()
        .collect();
    moved_keys
        .into_iter()
        .filter_map(|key| exclusions.remove(&key).map(|value| (key, value)))
        .collect()
}

fn exclusion_moves(key: &str, moving: &HashSet<String>, today: &str) -> bool {
    let Some((date, book_id)) = key.split_once(COMPLETION_KEY_SEPARATOR) else {
        return false;
    };
    date >= today && moving.contains(book_id)
}

pub fn merge_exclusions(snapshot: &mut Value, exclusions: Map<String, Value>) {
    if exclusions.is_empty() {
        return;
    }
    if !snapshot
        .get("blocked_day_books")
        .is_some_and(Value::is_object)
    {
        snapshot["blocked_day_books"] = Value::Object(Map::new());
    }
    if let Some(target) = snapshot["blocked_day_books"].as_object_mut() {
        target.extend(exclusions);
    }
}

pub fn text(row: &Value, key: &str) -> String {
    match row.get(key) {
        Some(Value::String(value)) => value.clone(),
        Some(Value::Number(value)) => value.to_string(),
        _ => String::new(),
    }
}
