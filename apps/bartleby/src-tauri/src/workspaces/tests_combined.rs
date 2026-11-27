//! Regression tests for the All Workspaces view: merged load and split saves.
use std::collections::HashMap;

use serde_json::{json, Value};

use super::test_support::{activate, activate_all};
use super::test_support::{
    book, planner_snapshot, save_request, seed_two, stored_revision, stored_snapshot,
    transfer_request, TestDirectory, PAST_DAY,
};
use super::{save_snapshot, transfer_books, SaveRequest};
use crate::workspace_model::{ALL_WORKSPACES_ID, DEFAULT_WORKSPACE_ID};

const SOURCE_GOAL_MINUTES: i64 = 45;
const TARGET_GOAL_MINUTES: i64 = 60;

/// Two workspaces: Dune and Emma in the default one, Ulysses in the second.
fn seeded(name: &str) -> (TestDirectory, String) {
    let directory = TestDirectory::new(name);
    let mut source = planner_snapshot(vec![book("book-dune", "Dune"), book("book-emma", "Emma")]);
    source["preferences"] = json!({ "dailyGoalMinutes": SOURCE_GOAL_MINUTES });
    source["last_result"] = json!({ "created_at": "2026-06-10T08:00:00Z", "schedule": [
        { "book_id": "book-dune", "date": PAST_DAY, "minutes": 20, "session_index": 0 }
    ], "summary": null });
    let mut target = planner_snapshot(vec![book("book-ulysses", "Ulysses")]);
    target["preferences"] = json!({ "dailyGoalMinutes": TARGET_GOAL_MINUTES });
    let target_id = seed_two(&directory.path, source, target);
    (directory, target_id)
}

fn combined_request(state: Value, revisions: HashMap<String, u64>) -> SaveRequest {
    SaveRequest {
        expected_revisions: Some(revisions),
        ..save_request(Some(ALL_WORKSPACES_ID), state)
    }
}

fn titles(snapshot: &Value) -> Vec<String> {
    snapshot["books"]
        .as_array()
        .map(|books| {
            books
                .iter()
                .map(|book| book["title"].as_str().unwrap_or_default().to_string())
                .collect()
        })
        .unwrap_or_default()
}

#[test]
fn all_workspaces_load_merges_records_and_keeps_the_one_goal() {
    let (directory, target_id) = seeded("combined-load");
    let load = activate_all(&directory.path).expect("expected All Workspaces");
    assert_eq!(load.workspace_id, ALL_WORKSPACES_ID);
    assert_eq!(titles(&load.state), ["Dune", "Emma", "Ulysses"]);
    assert_eq!(
        load.state["preferences"]["dailyGoalMinutes"],
        TARGET_GOAL_MINUTES
    );
    let meta = load.combined.expect("expected combined metadata");
    assert_eq!(meta.book_workspaces["book-ulysses"], target_id);
    assert_eq!(meta.book_workspaces["book-dune"], DEFAULT_WORKSPACE_ID);
}

#[test]
fn combined_save_routes_edits_to_the_owning_workspace_only() {
    let (directory, target_id) = seeded("combined-route");
    let load = activate_all(&directory.path).expect("expected All Workspaces");
    let source_revision = stored_revision(&directory.path, DEFAULT_WORKSPACE_ID);
    let mut state = load.state;
    state["books"][2]["title"] = json!("Ulysses (annotated)");
    let revisions = load.combined.expect("expected combined metadata").revisions;
    save_snapshot(&directory.path, &combined_request(state, revisions))
        .expect("expected combined save");
    assert_eq!(
        titles(&stored_snapshot(&directory.path, &target_id)),
        ["Ulysses (annotated)"]
    );
    assert_eq!(
        titles(&stored_snapshot(&directory.path, DEFAULT_WORKSPACE_ID)),
        ["Dune", "Emma"]
    );
    assert_eq!(
        stored_revision(&directory.path, DEFAULT_WORKSPACE_ID),
        source_revision
    );
    assert_eq!(
        stored_snapshot(&directory.path, &target_id)["preferences"],
        json!({})
    );
}

#[test]
fn new_books_need_an_explicit_workspace() {
    let (directory, target_id) = seeded("combined-new-book");
    let load = activate_all(&directory.path).expect("expected All Workspaces");
    let revisions = load.combined.expect("expected combined metadata").revisions;
    let mut state = load.state;
    state["books"]
        .as_array_mut()
        .expect("expected books")
        .push(book("book-new", "Middlemarch"));
    let error = save_snapshot(
        &directory.path,
        &combined_request(state.clone(), revisions.clone()),
    )
    .expect_err("expected a missing destination");
    assert!(
        error.contains("Choose a workspace for \"Middlemarch\""),
        "{error}"
    );
    state["book_workspaces"] = json!({ "book-new": target_id });
    save_snapshot(&directory.path, &combined_request(state, revisions))
        .expect("expected combined save");
    assert_eq!(
        titles(&stored_snapshot(&directory.path, &target_id)),
        ["Ulysses", "Middlemarch"]
    );
    assert!(stored_snapshot(&directory.path, &target_id)
        .get("book_workspaces")
        .is_none());
}

#[test]
fn history_of_a_moved_book_stays_where_it_was_read() {
    let (directory, target_id) = seeded("combined-history");
    transfer_books(
        &directory.path,
        &transfer_request(&target_id, &["book-dune"]),
    )
    .expect("expected transfer");
    let load = activate_all(&directory.path).expect("expected All Workspaces");
    let revisions = load.combined.expect("expected combined metadata").revisions;
    save_snapshot(&directory.path, &combined_request(load.state, revisions))
        .expect("expected combined save");
    let source = stored_snapshot(&directory.path, DEFAULT_WORKSPACE_ID);
    assert_eq!(source["last_result"]["schedule"][0]["book_id"], "book-dune");
    assert_eq!(
        titles(&stored_snapshot(&directory.path, &target_id)),
        ["Ulysses", "Dune"]
    );
}

#[test]
fn stale_or_closed_all_workspaces_saves_write_nothing() {
    let (directory, _target_id) = seeded("combined-stale");
    let load = activate_all(&directory.path).expect("expected All Workspaces");
    let mut revisions = load.combined.expect("expected combined metadata").revisions;
    revisions.insert(DEFAULT_WORKSPACE_ID.to_string(), 0);
    let error = save_snapshot(
        &directory.path,
        &combined_request(load.state.clone(), revisions.clone()),
    )
    .expect_err("expected a stale save");
    assert!(error.starts_with("STALE_WORKSPACE_REVISION"), "{error}");
    activate(&directory.path, DEFAULT_WORKSPACE_ID).expect("expected single workspace");
    let error = save_snapshot(&directory.path, &combined_request(load.state, revisions))
        .expect_err("expected a closed view");
    assert!(
        error.contains("All Workspaces is no longer open"),
        "{error}"
    );
}

#[test]
fn deleting_a_book_in_all_workspaces_removes_it_from_its_workspace() {
    let (directory, target_id) = seeded("combined-delete");
    let load = activate_all(&directory.path).expect("expected All Workspaces");
    let revisions = load.combined.expect("expected combined metadata").revisions;
    let mut state = load.state;
    state["books"]
        .as_array_mut()
        .expect("expected books")
        .retain(|book| book["book_id"] != "book-ulysses");
    save_snapshot(&directory.path, &combined_request(state, revisions))
        .expect("expected combined save");
    assert!(titles(&stored_snapshot(&directory.path, &target_id)).is_empty());
}
