//! Transfer tests for `blocked_by` conflicts, dependency removal, and undo.
use serde_json::{json, Value};

use super::requests::{DependencyPolicy, ShelfPolicy};
use super::test_support::{
    book, planner_snapshot, seed_two, stored_book, stored_needs_replan, stored_revision,
    stored_state, transfer_request, TestDirectory,
};
use super::transfer::TransferReceipt;
use super::transfer_dependencies::{DependencyConflict, DependencyDirection};
use super::{transfer_books, TransferOutcome, TransferResult};
use crate::workspace_model::DEFAULT_WORKSPACE_ID;

/// `book-b` comes after `book-a`; `book-c` is independent.
fn chained_snapshot() -> Value {
    let mut blocked = book("book-b", "Emma");
    blocked["blocked_by"] = json!("book-a");
    planner_snapshot(vec![
        book("book-a", "Dune"),
        blocked,
        book("book-c", "Ulysses"),
    ])
}

fn seeded(name: &str) -> (TestDirectory, String) {
    let directory = TestDirectory::new(name);
    let target_id = seed_two(
        &directory.path,
        chained_snapshot(),
        planner_snapshot(vec![]),
    );
    (directory, target_id)
}

fn conflicts_of(result: TransferResult) -> Vec<DependencyConflict> {
    match result.outcome {
        TransferOutcome::Conflict { conflicts } => conflicts,
        TransferOutcome::Moved(receipt) => panic!("unexpected move: {:?}", receipt.moved_book_ids),
    }
}

fn receipt_of(result: TransferResult) -> TransferReceipt {
    match result.outcome {
        TransferOutcome::Moved(receipt) => receipt,
        TransferOutcome::Conflict { conflicts } => panic!("unexpected conflicts: {conflicts:?}"),
    }
}

fn assert_rejected_without_writes(book_id: &str, direction: DependencyDirection) {
    let (directory, target_id) = seeded("dependency-reject");
    let before = stored_state(&directory.path);
    let result = transfer_books(&directory.path, &transfer_request(&target_id, &[book_id]))
        .expect("expected conflict outcome");
    let conflicts = conflicts_of(result);
    assert_eq!(conflicts.len(), 1);
    assert_eq!(conflicts[0].direction, direction);
    assert_eq!(conflicts[0].book_id, "book-b");
    assert_eq!(stored_state(&directory.path), before);
    assert!(!stored_needs_replan(&directory.path, &target_id));
    assert!(!stored_needs_replan(&directory.path, DEFAULT_WORKSPACE_ID));
}

#[test]
fn outgoing_dependency_conflict_is_rejected_without_writes() {
    assert_rejected_without_writes("book-b", DependencyDirection::Outgoing);
}

#[test]
fn incoming_dependency_conflict_is_rejected_without_writes() {
    assert_rejected_without_writes("book-a", DependencyDirection::Incoming);
}

#[test]
fn conflict_leaves_revisions_unchanged() {
    let (directory, target_id) = seeded("dependency-revisions");
    let source_revision = stored_revision(&directory.path, DEFAULT_WORKSPACE_ID);
    let target_revision = stored_revision(&directory.path, &target_id);
    transfer_books(&directory.path, &transfer_request(&target_id, &["book-a"]))
        .expect("expected conflict outcome");
    assert_eq!(
        stored_revision(&directory.path, DEFAULT_WORKSPACE_ID),
        source_revision
    );
    assert_eq!(
        stored_revision(&directory.path, &target_id),
        target_revision
    );
}

#[test]
fn remove_policy_clears_split_dependencies() {
    let (directory, target_id) = seeded("dependency-remove");
    let mut request = transfer_request(&target_id, &["book-b"]);
    request.dependency_policy = DependencyPolicy::Remove;
    let receipt = receipt_of(transfer_books(&directory.path, &request).expect("transfer"));
    assert_eq!(receipt.removed_dependencies.len(), 1);
    let moved = stored_book(&directory.path, &target_id, "book-b").expect("moved book");
    assert_eq!(moved["blocked_by"], Value::Null);
}

#[test]
fn moving_related_books_together_has_no_conflict() {
    let (directory, target_id) = seeded("dependency-together");
    let request = transfer_request(&target_id, &["book-a", "book-b"]);
    let receipt = receipt_of(transfer_books(&directory.path, &request).expect("transfer"));
    assert!(receipt.removed_dependencies.is_empty());
    let moved = stored_book(&directory.path, &target_id, "book-b").expect("moved book");
    assert_eq!(moved["blocked_by"], "book-a");
}

#[test]
fn undo_restores_books_dependencies_and_shelves() {
    let (directory, target_id) = seeded("dependency-undo");
    let original_a = stored_book(&directory.path, DEFAULT_WORKSPACE_ID, "book-a");
    let original_b = stored_book(&directory.path, DEFAULT_WORKSPACE_ID, "book-b");
    let mut request = transfer_request(&target_id, &["book-a"]);
    request.dependency_policy = DependencyPolicy::Remove;
    request.shelf_policy = ShelfPolicy::Clear;
    let receipt = receipt_of(transfer_books(&directory.path, &request).expect("transfer"));
    let staying = stored_book(&directory.path, DEFAULT_WORKSPACE_ID, "book-b").expect("book-b");
    assert_eq!(staying["blocked_by"], Value::Null);
    receipt_of(transfer_books(&directory.path, &receipt.undo).expect("expected undo"));
    let restored_a = stored_book(&directory.path, DEFAULT_WORKSPACE_ID, "book-a");
    assert_eq!(restored_a, original_a);
    assert_eq!(
        stored_book(&directory.path, DEFAULT_WORKSPACE_ID, "book-b"),
        original_b
    );
    assert!(stored_book(&directory.path, &target_id, "book-a").is_none());
}
