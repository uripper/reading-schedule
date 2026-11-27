//! Refuses saves that would put one book in two places.
//!
//! A book lives in exactly one workspace. A renderer save carries a whole planner
//! snapshot, so if the screen ever held one workspace's books while the save targeted
//! another, the books would be copied instead of moved. These checks stop that before
//! anything is written; the renderer then reloads the workspace from storage.
use std::collections::HashSet;

use serde_json::Value;

use super::transfer_rows::text;
use crate::workspace_model;

/// Prefix of errors meaning the renderer's data no longer matches storage.
pub const OUT_OF_SYNC_PREFIX: &str = "WORKSPACE_OUT_OF_SYNC";

/// Checks a single-workspace save: it must target the workspace its data came from,
/// list each book once, and contain no book stored in another workspace.
pub fn check_single_save(
    state: &Value,
    workspace_id: &str,
    snapshot: &Value,
) -> Result<(), String> {
    let tagged_id = snapshot.get("workspace_id").and_then(Value::as_str);
    if tagged_id.is_some_and(|tagged_id| tagged_id != workspace_id) {
        return Err(out_of_sync(
            "these changes belong to a different workspace than the one being saved",
        ));
    }
    check_unique_books(snapshot)?;
    let other_books = other_workspace_book_ids(state, workspace_id);
    let foreign = array(snapshot, "books")
        .into_iter()
        .find(|book| other_books.contains(&text(book, "book_id")));
    match foreign {
        None => Ok(()),
        Some(book) => Err(out_of_sync(&format!(
            "\"{}\" belongs to another workspace",
            text(&book, "title")
        ))),
    }
}

/// Every book id may appear only once in a snapshot (merged or single).
pub fn check_unique_books(snapshot: &Value) -> Result<(), String> {
    let mut seen = HashSet::new();
    let duplicate = array(snapshot, "books")
        .into_iter()
        .find(|book| !seen.insert(text(book, "book_id")));
    match duplicate {
        None => Ok(()),
        Some(book) => Err(out_of_sync(&format!(
            "\"{}\" appears twice",
            text(&book, "title")
        ))),
    }
}

fn other_workspace_book_ids(state: &Value, workspace_id: &str) -> HashSet<String> {
    workspace_model::workspaces(state)
        .iter()
        .filter(|entry| workspace_model::workspace_id(entry) != Some(workspace_id))
        .filter_map(|entry| entry.get(workspace_model::KEY_SNAPSHOT))
        .flat_map(|snapshot| array(snapshot, "books"))
        .map(|book| text(&book, "book_id"))
        .collect()
}

fn array(value: &Value, key: &str) -> Vec<Value> {
    value
        .get(key)
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
}

fn out_of_sync(reason: &str) -> String {
    format!("{OUT_OF_SYNC_PREFIX}: Nothing was saved because {reason}. Bartleby reloads the saved data so nothing gets duplicated.")
}
