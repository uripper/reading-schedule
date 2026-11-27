//! Finds `blocked_by` (After Book) links that a transfer would split across workspaces.
use std::collections::HashSet;

use serde::Serialize;
use serde_json::Value;

use super::transfer::book_id;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DependencyDirection {
    /// A staying book comes after a moving book.
    Incoming,
    /// A moving book comes after a staying book.
    Outgoing,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyConflict {
    pub blocked_by_id: String,
    /// The book whose `blocked_by` would point into another workspace.
    pub book_id: String,
    pub direction: DependencyDirection,
}

/// Lists every dependency between the moving set and the books left behind.
pub fn dependency_conflicts(
    source_books: &[Value],
    moving: &HashSet<String>,
) -> Vec<DependencyConflict> {
    let source_ids: HashSet<&str> = source_books.iter().filter_map(book_id).collect();
    source_books
        .iter()
        .filter_map(|book| book_conflict(book, moving, &source_ids))
        .collect()
}

fn book_conflict(
    book: &Value,
    moving: &HashSet<String>,
    source_ids: &HashSet<&str>,
) -> Option<DependencyConflict> {
    let current_id = book_id(book)?;
    let blocker_id = blocker_id(book)?;
    if !source_ids.contains(blocker_id) {
        return None;
    }
    let book_moves = moving.contains(current_id);
    if book_moves == moving.contains(blocker_id) {
        return None;
    }
    let direction = match book_moves {
        true => DependencyDirection::Outgoing,
        false => DependencyDirection::Incoming,
    };
    Some(DependencyConflict {
        blocked_by_id: blocker_id.to_string(),
        book_id: current_id.to_string(),
        direction,
    })
}

/// Clears `blocked_by` on the books named by `conflicts`.
pub fn clear_dependencies(books: &mut [Value], conflicts: &[DependencyConflict]) {
    let affected: HashSet<&str> = conflicts
        .iter()
        .map(|conflict| conflict.book_id.as_str())
        .collect();
    books
        .iter_mut()
        .filter(|book| book_id(book).is_some_and(|id| affected.contains(id)))
        .for_each(|book| book["blocked_by"] = Value::Null);
}

fn blocker_id(book: &Value) -> Option<&str> {
    let blocker_id = book.get("blocked_by").and_then(Value::as_str)?.trim();
    if blocker_id.is_empty() {
        return None;
    }
    Some(blocker_id)
}
