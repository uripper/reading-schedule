//! Moves books between workspaces as one atomic envelope change.
//!
//! Invariants: a moved book keeps its id, metadata, cover, progress, status, and
//! planning constraints. Reading history stays where it happened: sessions,
//! completions, and completed or past schedule rows remain in the source workspace,
//! so minutes are never double-counted. Only uncompleted rows from today onward are
//! dropped from the source; the destination plans fresh sessions on its next replan.
//! Dependencies (`blocked_by`) never cross workspaces: a conflicting transfer is
//! rejected unless the request explicitly asks to remove those dependencies.
use std::collections::HashSet;

use serde::Serialize;
use serde_json::{json, Value};

use super::requests::{validate_day_key, DependencyPolicy, ShelfPolicy, TransferRequest};
use super::transfer_dependencies::{clear_dependencies, dependency_conflicts, DependencyConflict};
use super::{snapshot_mut, snapshot_of, transfer_rows};
use crate::workspace_model;

type BookPartition = (Vec<Value>, Vec<Value>);

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase", tag = "status")]
pub enum TransferOutcome {
    #[serde(rename = "dependency_conflict")]
    Conflict { conflicts: Vec<DependencyConflict> },
    #[serde(rename = "moved")]
    Moved(TransferReceipt),
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferReceipt {
    pub moved_book_ids: Vec<String>,
    pub removed_dependencies: Vec<DependencyConflict>,
    pub removed_schedule_rows: usize,
    /// Reverse request that restores the moved books and any cleared dependencies.
    pub undo: TransferRequest,
}

pub fn transfer_books(
    state: &mut Value,
    request: &TransferRequest,
) -> Result<TransferOutcome, String> {
    let moving = validated_moving_set(state, request)?;
    let source_books = books_of(snapshot_of(state, &request.source_workspace_id)?);
    let conflicts = dependency_conflicts(&source_books, &moving);
    if !conflicts.is_empty() && request.dependency_policy == DependencyPolicy::Reject {
        return Ok(TransferOutcome::Conflict { conflicts });
    }
    let undo = undo_request(request, &source_books, &conflicts);
    let (mut moved, mut staying): BookPartition = source_books
        .into_iter()
        .partition(|book| book_id(book).is_some_and(|id| moving.contains(id)));
    clear_dependencies(&mut moved, &conflicts);
    clear_dependencies(&mut staying, &conflicts);
    apply_shelf_policy(&mut moved, request.shelf_policy);
    let removed_schedule_rows = update_source(state, request, staying)?;
    update_target(state, request, moved)?;
    Ok(TransferOutcome::Moved(TransferReceipt {
        moved_book_ids: request.book_ids.clone(),
        removed_dependencies: conflicts,
        removed_schedule_rows,
        undo,
    }))
}

fn validated_moving_set(
    state: &Value,
    request: &TransferRequest,
) -> Result<HashSet<String>, String> {
    validate_day_key(&request.today)?;
    validate_workspaces(state, request)?;
    let moving = moving_ids(request);
    if moving.is_empty() || moving.contains("") {
        return Err("Choose at least one book to move.".to_string());
    }
    let source_ids: HashSet<String> = book_ids(snapshot_of(state, &request.source_workspace_id)?)
        .into_iter()
        .collect();
    if let Some(missing) = moving.iter().find(|id| !source_ids.contains(*id)) {
        return Err(format!(
            "Book {missing} is not in the source workspace; refresh and try again."
        ));
    }
    let target_ids: HashSet<String> = book_ids(snapshot_of(state, &request.target_workspace_id)?)
        .into_iter()
        .collect();
    if let Some(duplicate) = moving.iter().find(|id| target_ids.contains(*id)) {
        return Err(format!(
            "Book {duplicate} already exists in the destination workspace."
        ));
    }
    Ok(moving)
}

fn validate_workspaces(state: &Value, request: &TransferRequest) -> Result<(), String> {
    if request.source_workspace_id == request.target_workspace_id {
        return Err("Choose a different destination workspace.".to_string());
    }
    let target = workspace_model::find_workspace(state, &request.target_workspace_id)
        .ok_or_else(|| format!("Workspace {} does not exist.", request.target_workspace_id))?;
    if workspace_model::is_archived(target) {
        return Err("Restore the destination workspace before moving books into it.".to_string());
    }
    snapshot_of(state, &request.source_workspace_id).map(|_| ())
}

fn undo_request(
    request: &TransferRequest,
    source_books: &[Value],
    conflicts: &[DependencyConflict],
) -> TransferRequest {
    let restored_ids: HashSet<&str> = request
        .book_ids
        .iter()
        .map(String::as_str)
        .chain(conflicts.iter().map(|conflict| conflict.book_id.as_str()))
        .collect();
    let restore_books = source_books
        .iter()
        .filter(|book| book_id(book).is_some_and(|id| restored_ids.contains(id)))
        .cloned()
        .collect();
    TransferRequest {
        book_ids: request.book_ids.clone(),
        dependency_policy: DependencyPolicy::Reject,
        restore_books: Some(restore_books),
        shelf_policy: ShelfPolicy::Keep,
        source_workspace_id: request.target_workspace_id.clone(),
        target_workspace_id: request.source_workspace_id.clone(),
        today: request.today.clone(),
    }
}

fn moving_ids(request: &TransferRequest) -> HashSet<String> {
    request
        .book_ids
        .iter()
        .map(|id| id.trim().to_string())
        .collect()
}

fn update_source(
    state: &mut Value,
    request: &TransferRequest,
    staying: Vec<Value>,
) -> Result<usize, String> {
    let moving = moving_ids(request);
    let snapshot = snapshot_mut(state, &request.source_workspace_id)?;
    snapshot["books"] = Value::Array(staying);
    let removed_rows = transfer_rows::remove_future_rows(snapshot, &moving, &request.today);
    bump(state, &request.source_workspace_id)?;
    Ok(removed_rows)
}

fn update_target(
    state: &mut Value,
    request: &TransferRequest,
    moved: Vec<Value>,
) -> Result<(), String> {
    let exclusions = transfer_rows::take_future_exclusions(
        snapshot_mut(state, &request.source_workspace_id)?,
        &moving_ids(request),
        &request.today,
    );
    let snapshot = snapshot_mut(state, &request.target_workspace_id)?;
    let mut target_books = books_of(snapshot);
    target_books.extend(moved);
    restore_records(&mut target_books, request.restore_books.as_deref());
    snapshot["books"] = Value::Array(target_books);
    transfer_rows::merge_exclusions(snapshot, exclusions);
    bump(state, &request.target_workspace_id)
}

/// Replaces books with their pre-transfer records when undoing a transfer.
fn restore_records(books: &mut [Value], restore_books: Option<&[Value]>) {
    for record in restore_books.unwrap_or_default() {
        restore_record(books, record);
    }
}

fn restore_record(books: &mut [Value], record: &Value) {
    let Some(record_id) = book_id(record) else {
        return;
    };
    if let Some(book) = books
        .iter_mut()
        .find(|book| book_id(book) == Some(record_id))
    {
        *book = record.clone();
    }
}

fn apply_shelf_policy(books: &mut [Value], shelf_policy: ShelfPolicy) {
    if shelf_policy == ShelfPolicy::Keep {
        return;
    }
    for book in books.iter_mut() {
        book["shelf"] = json!("");
        book["collections"] = json!([]);
    }
}

/// Records the write and asks the renderer to replan this workspace when opened.
fn bump(state: &mut Value, workspace_id: &str) -> Result<(), String> {
    let entry = workspace_model::find_workspace_mut(state, workspace_id)
        .ok_or_else(|| format!("Workspace {workspace_id} does not exist."))?;
    workspace_model::bump_revision(entry);
    entry[workspace_model::KEY_NEEDS_REPLAN] = Value::Bool(true);
    Ok(())
}

fn books_of(snapshot: &Value) -> Vec<Value> {
    snapshot
        .get("books")
        .and_then(Value::as_array)
        .cloned()
        .unwrap_or_default()
}

pub fn book_ids(snapshot: &Value) -> Vec<String> {
    books_of(snapshot)
        .iter()
        .filter_map(book_id)
        .map(str::to_string)
        .collect()
}

pub fn book_id(book: &Value) -> Option<&str> {
    book.get("book_id").and_then(Value::as_str).map(str::trim)
}
