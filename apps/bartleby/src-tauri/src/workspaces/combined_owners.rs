//! Decides which workspace owns each record of a merged All Workspaces save.
//!
//! Books keep the workspace that stores them; new books need an explicit destination.
//! Keyed records (schedule rows, sessions, completions, manual exclusions) stay with
//! the workspace that already stores the same key, so reading history of a book that
//! moved stays where it happened. New records follow their book's workspace.
use std::collections::HashMap;

use serde_json::Value;

use super::combined::{array, stored_snapshot};
use super::transfer_rows::text;
use crate::workspace_model;

const KEY_BOOK_WORKSPACES: &str = "book_workspaces";

/// Workspace ids that already store a key.
type KeyHolders = HashMap<String, Vec<String>>;

#[derive(Debug, Default)]
pub struct Owners {
    blocked: KeyHolders,
    books: HashMap<String, String>,
    completions: KeyHolders,
    rows: KeyHolders,
    sessions: KeyHolders,
}

/// Indexes stored records of usable workspaces and the renderer's new-book choices.
pub fn build_owners(state: &Value, merged: &Value) -> Result<Owners, String> {
    let mut owners = Owners::default();
    super::combined::usable_entries(state)
        .into_iter()
        .for_each(|entry| index_workspace(&mut owners, entry));
    let new_books: Vec<Value> = array(merged, "books")
        .into_iter()
        .filter(|book| !owners.books.contains_key(&text(book, "book_id")))
        .collect();
    for book in new_books {
        let destination = new_book_destination(state, merged, &book)?;
        owners.books.insert(text(&book, "book_id"), destination);
    }
    Ok(owners)
}

fn index_workspace(owners: &mut Owners, entry: &Value) {
    let id = workspace_model::workspace_id(entry)
        .unwrap_or_default()
        .to_string();
    let snapshot = stored_snapshot(entry);
    owners.books.extend(
        array(&snapshot, "books")
            .iter()
            .map(|book| (text(book, "book_id"), id.clone())),
    );
    let rows = array(
        snapshot.get("last_result").unwrap_or(&Value::Null),
        "schedule",
    );
    hold(&mut owners.rows, rows.iter().map(row_key), &id);
    let session_ids = array(&snapshot, "sessions");
    hold(
        &mut owners.sessions,
        session_ids.iter().map(|session| text(session, "id")),
        &id,
    );
    hold(
        &mut owners.completions,
        object_keys(&snapshot, "schedule_completions"),
        &id,
    );
    hold(
        &mut owners.blocked,
        object_keys(&snapshot, "blocked_day_books"),
        &id,
    );
}

impl Owners {
    pub fn book(&self, book_id: &str) -> Option<&String> {
        self.books.get(book_id)
    }

    pub fn row(&self, row: &Value) -> Option<String> {
        keyed(
            &self.rows,
            &row_key(row),
            self.books.get(&text(row, "book_id")),
        )
    }

    pub fn session(&self, session: &Value) -> Option<String> {
        keyed(
            &self.sessions,
            &text(session, "id"),
            self.books.get(&text(session, "book_id")),
        )
    }

    pub fn completion(&self, key: &str) -> Option<String> {
        let book_id = key.rsplit('|').next().unwrap_or_default();
        keyed(&self.completions, key, self.books.get(book_id))
    }

    pub fn blocked(&self, key: &str) -> Option<String> {
        let book_id = key
            .split_once('|')
            .map(|(_, book)| book)
            .unwrap_or_default();
        keyed(&self.blocked, key, self.books.get(book_id))
    }
}

/// Prefers a stored holder (the book's own workspace when it is one), else the book.
fn keyed(holders: &KeyHolders, key: &str, book_owner: Option<&String>) -> Option<String> {
    let Some(candidates) = holders.get(key) else {
        return book_owner.cloned();
    };
    let preferred = book_owner.filter(|owner| candidates.contains(owner));
    preferred.or_else(|| candidates.first()).cloned()
}

fn hold(holders: &mut KeyHolders, keys: impl Iterator<Item = String>, id: &str) {
    keys.for_each(|key| holders.entry(key).or_default().push(id.to_string()));
}

fn object_keys(snapshot: &Value, key: &str) -> impl Iterator<Item = String> {
    snapshot
        .get(key)
        .and_then(Value::as_object)
        .map(|object| object.keys().cloned().collect::<Vec<_>>())
        .unwrap_or_default()
        .into_iter()
}

/// Mirrors the renderer's exact session key.
pub fn row_key(row: &Value) -> String {
    format!(
        "{}|{}|{}",
        text(row, "date"),
        text(row, "session_index"),
        text(row, "book_id")
    )
}

/// A book added in the All Workspaces view must name a usable destination.
fn new_book_destination(state: &Value, merged: &Value, book: &Value) -> Result<String, String> {
    let book_id = text(book, "book_id");
    let destination = merged
        .get(KEY_BOOK_WORKSPACES)
        .and_then(|choices| choices.get(&book_id))
        .and_then(Value::as_str)
        .unwrap_or_default();
    let is_usable = workspace_model::find_workspace(state, destination)
        .is_some_and(|entry| !workspace_model::is_archived(entry));
    if is_usable {
        return Ok(destination.to_string());
    }
    Err(format!(
        "Choose a workspace for \"{}\" before it can be saved.",
        text(book, "title")
    ))
}
