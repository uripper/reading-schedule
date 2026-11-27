//! Save routing, revision checks, session completion, and aggregate snapshot tests.
use serde_json::{json, Value};

use super::save::STALE_REVISION_PREFIX;
use super::test_support::{
    book, create_named, planner_snapshot, save_request, seed_default, seed_two, stored_book,
    stored_needs_replan, stored_revision, stored_snapshot, stored_state, transfer_request,
    TestDirectory, SECOND_WORKSPACE_NAME, TODAY,
};
use super::{
    delete, list, load, save_snapshot, set_archived, set_session_completion, snapshots,
    transfer_books, CompletionRequest, DeleteRequest, SaveRequest,
};
use crate::workspace_model::DEFAULT_WORKSPACE_ID;

const FIRST_REVISION: u64 = 1;
const SECOND_REVISION: u64 = 2;
const THIRD_REVISION: u64 = 3;
const STALE_REVISION: u64 = 0;
const SESSION_KEY: &str = "2026-06-10|0|book-a";

fn saved_revision(payload: &Value) -> u64 {
    payload["revision"].as_u64().unwrap_or_default()
}

fn revisioned_request(snapshot: Value, expected_revision: u64) -> SaveRequest {
    SaveRequest {
        expected_revision: Some(expected_revision),
        ..save_request(Some(DEFAULT_WORKSPACE_ID), snapshot)
    }
}

fn completion_request(workspace_id: &str, session_key: &str) -> CompletionRequest {
    CompletionRequest {
        completed: true,
        session_key: session_key.to_string(),
        workspace_id: workspace_id.to_string(),
    }
}

/// Snapshot with one unstarted book scheduled today.
fn scheduled_snapshot() -> Value {
    let mut snapshot = planner_snapshot(vec![book("book-a", "Dune")]);
    snapshot["books"][0]["status"] = json!("to_read");
    snapshot["last_result"] = json!({
        "schedule": [{ "book_id": "book-a", "date": TODAY, "session_index": 0 }],
    });
    snapshot
}

#[test]
fn first_save_creates_default_workspace() {
    let directory = TestDirectory::new("first-save");
    let payload = save_snapshot(
        &directory.path,
        &save_request(None, planner_snapshot(vec![])),
    )
    .expect("expected first save");
    assert_eq!(payload["workspaceId"], DEFAULT_WORKSPACE_ID);
    assert_eq!(saved_revision(&payload), FIRST_REVISION);
    let catalog = list(&directory.path).expect("expected catalog");
    assert_eq!(catalog.active_workspace_id, DEFAULT_WORKSPACE_ID);
    assert_eq!(catalog.workspaces.len(), 1);
}

#[test]
fn save_routes_by_workspace_id() {
    let directory = TestDirectory::new("save-routing");
    let target_id = seed_two(
        &directory.path,
        planner_snapshot(vec![book("book-a", "Dune")]),
        planner_snapshot(vec![book("book-b", "Emma")]),
    );
    assert!(stored_book(&directory.path, DEFAULT_WORKSPACE_ID, "book-b").is_none());
    assert!(stored_book(&directory.path, &target_id, "book-b").is_some());
    assert!(stored_book(&directory.path, &target_id, "book-a").is_none());
    assert_eq!(
        stored_revision(&directory.path, DEFAULT_WORKSPACE_ID),
        FIRST_REVISION
    );
}

#[test]
fn revisions_increase_and_stale_saves_write_nothing() {
    let directory = TestDirectory::new("save-revisions");
    seed_default(&directory.path, planner_snapshot(vec![]));
    let request = revisioned_request(planner_snapshot(vec![]), FIRST_REVISION);
    let payload = save_snapshot(&directory.path, &request).expect("expected second save");
    assert_eq!(saved_revision(&payload), SECOND_REVISION);
    let request = revisioned_request(planner_snapshot(vec![]), SECOND_REVISION);
    let payload = save_snapshot(&directory.path, &request).expect("expected third save");
    assert_eq!(saved_revision(&payload), THIRD_REVISION);
    let before = stored_state(&directory.path);
    let stale = revisioned_request(
        planner_snapshot(vec![book("book-a", "Dune")]),
        STALE_REVISION,
    );
    let error = save_snapshot(&directory.path, &stale).expect_err("expected stale reject");
    assert!(error.starts_with(STALE_REVISION_PREFIX));
    assert_eq!(stored_state(&directory.path), before);
}

#[test]
fn saves_to_archived_or_deleted_workspaces_are_rejected() {
    let directory = TestDirectory::new("save-gone");
    seed_default(&directory.path, planner_snapshot(vec![]));
    let second_id = create_named(&directory.path, SECOND_WORKSPACE_NAME);
    set_archived(&directory.path, &second_id, true).expect("expected archive");
    let request = save_request(Some(&second_id), planner_snapshot(vec![]));
    let error = save_snapshot(&directory.path, &request).expect_err("expected archived reject");
    assert!(error.contains("archived"));
    let delete_request = DeleteRequest {
        today: TODAY.to_string(),
        transfer_books_to: None,
        workspace_id: second_id,
    };
    delete(&directory.path, &delete_request).expect("expected delete");
    let error = save_snapshot(&directory.path, &request).expect_err("expected deleted reject");
    assert!(error.contains("no longer exists"));
}

#[test]
fn save_clears_needs_replan_set_by_transfer() {
    let directory = TestDirectory::new("save-replan");
    let source = planner_snapshot(vec![book("book-a", "Dune")]);
    let target_id = seed_two(&directory.path, source, planner_snapshot(vec![]));
    transfer_books(&directory.path, &transfer_request(&target_id, &["book-a"]))
        .expect("expected transfer");
    assert!(
        load(&directory.path, &target_id)
            .expect("load")
            .needs_replan
    );
    let request = save_request(
        Some(&target_id),
        stored_snapshot(&directory.path, &target_id),
    );
    save_snapshot(&directory.path, &request).expect("expected save");
    assert!(!stored_needs_replan(&directory.path, &target_id));
    assert!(
        !load(&directory.path, &target_id)
            .expect("load")
            .needs_replan
    );
    assert!(stored_needs_replan(&directory.path, DEFAULT_WORKSPACE_ID));
}

#[test]
fn session_completion_marks_key_and_starts_book() {
    let directory = TestDirectory::new("completion");
    let target_id = seed_two(
        &directory.path,
        planner_snapshot(vec![]),
        scheduled_snapshot(),
    );
    let revision_before = stored_revision(&directory.path, &target_id);
    set_session_completion(
        &directory.path,
        &completion_request(&target_id, SESSION_KEY),
    )
    .expect("expected completion");
    let snapshot = stored_snapshot(&directory.path, &target_id);
    assert_eq!(snapshot["schedule_completions"][SESSION_KEY], true);
    assert_eq!(snapshot["books"][0]["status"], "in_progress");
    assert_eq!(
        stored_revision(&directory.path, &target_id),
        revision_before + 1
    );
}

#[test]
fn session_completion_rejects_unknown_keys_and_archived_workspaces() {
    let directory = TestDirectory::new("completion-reject");
    let target_id = seed_two(
        &directory.path,
        planner_snapshot(vec![]),
        scheduled_snapshot(),
    );
    for session_key in ["2026-06-11|0|book-a", "not-a-key", "2026-06-10|0|"] {
        let request = completion_request(&target_id, session_key);
        assert!(set_session_completion(&directory.path, &request).is_err());
    }
    set_archived(&directory.path, &target_id, true).expect("expected archive");
    let request = completion_request(&target_id, SESSION_KEY);
    let error = set_session_completion(&directory.path, &request).expect_err("archived");
    assert!(error.contains("Restore"));
}

#[test]
fn snapshots_exclude_archived_workspaces() {
    let directory = TestDirectory::new("snapshots");
    let target_id = seed_two(
        &directory.path,
        planner_snapshot(vec![]),
        scheduled_snapshot(),
    );
    assert_eq!(snapshots(&directory.path).expect("snapshots").len(), 2);
    set_archived(&directory.path, &target_id, true).expect("expected archive");
    let entries = snapshots(&directory.path).expect("expected snapshots");
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].summary.id, DEFAULT_WORKSPACE_ID);
    assert_eq!(entries[0].state["preferences"]["theme"], "dark");
    assert_eq!(list(&directory.path).expect("catalog").workspaces.len(), 2);
}

#[test]
fn unchecking_a_session_clears_its_day_book_completion() {
    let directory = TestDirectory::new("completion-uncheck");
    let target_id = seed_two(
        &directory.path,
        planner_snapshot(vec![]),
        scheduled_snapshot(),
    );
    let mut request = completion_request(&target_id, SESSION_KEY);
    set_session_completion(&directory.path, &request).expect("expected completion");
    let parts: Vec<&str> = SESSION_KEY.split('|').collect();
    let day_key = format!("{}|{}", parts[0], parts[2]);
    let mut snapshot = stored_snapshot(&directory.path, &target_id);
    snapshot["schedule_completions"][day_key.as_str()] = serde_json::json!(true);
    save_snapshot(&directory.path, &save_request(Some(&target_id), snapshot))
        .expect("expected seeded day-book completion");
    request.completed = false;
    set_session_completion(&directory.path, &request).expect("expected uncheck");
    let stored = stored_snapshot(&directory.path, &target_id);
    assert_eq!(stored["schedule_completions"][SESSION_KEY], false);
    assert!(stored["schedule_completions"]
        .get(day_key.as_str())
        .is_none());
}

#[test]
fn saves_never_copy_books_from_another_workspace() {
    let directory = TestDirectory::new("save-guard");
    let target_id = seed_two(
        &directory.path,
        planner_snapshot(vec![book("book-a", "Dune")]),
        planner_snapshot(vec![book("book-b", "Emma")]),
    );
    let revision_before = stored_revision(&directory.path, &target_id);
    let copied = planner_snapshot(vec![book("book-b", "Emma"), book("book-a", "Dune")]);
    let error = save_snapshot(&directory.path, &save_request(Some(&target_id), copied))
        .expect_err("expected a cross-workspace save to be refused");
    assert!(error.starts_with("WORKSPACE_OUT_OF_SYNC"), "{error}");
    assert!(
        error.contains("\"Dune\" belongs to another workspace"),
        "{error}"
    );
    assert_eq!(
        stored_revision(&directory.path, &target_id),
        revision_before
    );
    let twice = planner_snapshot(vec![book("book-b", "Emma"), book("book-b", "Emma")]);
    let error = save_snapshot(&directory.path, &save_request(Some(&target_id), twice))
        .expect_err("expected a duplicated book to be refused");
    assert!(error.contains("appears twice"), "{error}");
    let mut mislabeled = planner_snapshot(vec![book("book-b", "Emma")]);
    mislabeled["workspace_id"] = serde_json::json!(DEFAULT_WORKSPACE_ID);
    let error = save_snapshot(&directory.path, &save_request(Some(&target_id), mislabeled))
        .expect_err("expected data from another workspace to be refused");
    assert!(error.contains("different workspace"), "{error}");
    assert_eq!(
        stored_revision(&directory.path, &target_id),
        revision_before
    );
}
