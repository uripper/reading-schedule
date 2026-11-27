//! Completes sessions of any workspace, used by the All Workspaces Today overview.
//!
//! The active workspace completes sessions through the renderer's own handlers; this
//! path serves the other workspaces, whose state is not loaded into the renderer. It
//! applies the same rules: the exact session key records completion, and completing
//! a session of an unstarted book marks the book in progress.
use serde_json::Value;

use super::requests::CompletionRequest;
use super::snapshot_mut;
use super::transfer_rows::text;
use crate::workspace_model;

const SESSION_KEY_PARTS: usize = 3;

pub fn set_session_completion(
    state: &mut Value,
    request: &CompletionRequest,
) -> Result<(), String> {
    let entry = workspace_model::find_workspace(state, &request.workspace_id)
        .ok_or_else(|| format!("Workspace {} does not exist.", request.workspace_id))?;
    if workspace_model::is_archived(entry) {
        return Err("Restore this workspace before changing its sessions.".to_string());
    }
    let book_id = session_book_id(&request.session_key)?;
    let snapshot = snapshot_mut(state, &request.workspace_id)?;
    if !has_scheduled_row(snapshot, &request.session_key) {
        return Err(
            "That session is no longer scheduled. Refresh Today and try again.".to_string(),
        );
    }
    snapshot["schedule_completions"][request.session_key.as_str()] = Value::Bool(request.completed);
    if !request.completed {
        clear_day_book_completion(snapshot, &request.session_key);
    }
    if request.completed {
        mark_book_started(snapshot, &book_id);
    }
    let entry = workspace_model::find_workspace_mut(state, &request.workspace_id)
        .ok_or_else(|| format!("Workspace {} does not exist.", request.workspace_id))?;
    workspace_model::bump_revision(entry);
    Ok(())
}

fn session_book_id(session_key: &str) -> Result<String, String> {
    let parts: Vec<&str> = session_key.split('|').collect();
    match parts.as_slice() {
        [_, _, book_id] if parts.len() == SESSION_KEY_PARTS && !book_id.is_empty() => {
            Ok((*book_id).to_string())
        }
        _ => Err(format!("Invalid session key {session_key:?}.")),
    }
}

fn has_scheduled_row(snapshot: &Value, session_key: &str) -> bool {
    snapshot
        .pointer("/last_result/schedule")
        .and_then(Value::as_array)
        .is_some_and(|rows| rows.iter().any(|row| row_key(row) == session_key))
}

fn row_key(row: &Value) -> String {
    format!(
        "{}|{}|{}",
        text(row, "date"),
        text(row, "session_index"),
        text(row, "book_id")
    )
}

fn mark_book_started(snapshot: &mut Value, book_id: &str) {
    let Some(books) = snapshot.get_mut("books").and_then(Value::as_array_mut) else {
        return;
    };
    let book = books
        .iter_mut()
        .find(|book| book.get("book_id").and_then(Value::as_str) == Some(book_id));
    let Some(book) = book else {
        return;
    };
    if book.get("status").and_then(Value::as_str) == Some("to_read") {
        book["status"] = Value::String("in_progress".to_string());
    }
}

/// Unchecking also clears the legacy day-book key (`date|book_id`), mirroring the
/// renderer, so a session completed through sync or older data really reopens.
fn clear_day_book_completion(snapshot: &mut Value, session_key: &str) {
    let mut parts = session_key.split('|');
    let (Some(date), Some(_), Some(book_id)) = (parts.next(), parts.next(), parts.next()) else {
        return;
    };
    if let Some(completions) = snapshot["schedule_completions"].as_object_mut() {
        completions.remove(&format!("{date}|{book_id}"));
    }
}
