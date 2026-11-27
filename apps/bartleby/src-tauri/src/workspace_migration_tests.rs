//! Regression tests for migrating single-library state into the workspace envelope.
use std::fs;
use std::path::Path;

use serde_json::{json, Value};

use crate::data_archive::import_archive_json_for_test;
use crate::state_store::paths::pre_workspace_backup_path;
use crate::state_store::{load_canonical_state_for_test, save_state_to_directory};
use crate::workspace_model::{
    self, APP_STATE_VERSION, DEFAULT_WORKSPACE_ID, KEY_APP_PREFERENCES, KEY_FEATURE_FLAGS,
};
use crate::workspace_storage_tests::archive_payload;
use crate::workspaces::test_support::{
    book, create_named, save_request, stored_snapshot, TestDirectory, DAILY_GOAL_MINUTES,
    SECOND_WORKSPACE_NAME, TODAY,
};
use crate::workspaces::{load, save_snapshot};

const SECOND_GOAL_MINUTES: i64 = 90;
const PLANNER_SNAPSHOT_VERSION: i64 = 1;

/// Single-library state with history and both preference levels.
fn legacy_state() -> Value {
    json!({
        "blocked_day_books": { format!("{TODAY}|book-a"): true },
        "books": [book("book-a", "Dune"), book("book-b", "Emma")],
        "feature_flags": { "kobo": true },
        "last_result": { "schedule": [{ "book_id": "book-a", "date": TODAY, "session_index": 0 }] },
        "preferences": { "dailyGoalMinutes": DAILY_GOAL_MINUTES, "theme": "dark" },
        "schedule_completions": { format!("{TODAY}|0|book-a"): true },
        "sessions": [{ "book_id": "book-a", "date": TODAY, "minutes": 20 }],
        "settings": { "start_date": TODAY },
    })
}

fn versioned_state(version: Option<i64>) -> Value {
    let mut state = legacy_state();
    if let Some(version) = version {
        state["state_version"] = json!(version);
    }
    state
}

fn migrated_state(directory: &Path, state: &Value) -> Value {
    save_state_to_directory(directory, state).expect("expected legacy write");
    load_canonical_state_for_test(directory).state
}

fn read_backup(directory: &Path) -> Value {
    let payload = fs::read_to_string(pre_workspace_backup_path(directory)).expect("backup file");
    serde_json::from_str(&payload).expect("expected backup JSON")
}

fn assert_single_default_workspace(state: &Value, legacy: &Value) {
    assert_eq!(state["state_version"], APP_STATE_VERSION);
    assert_eq!(state["active_workspace_id"], DEFAULT_WORKSPACE_ID);
    assert_eq!(workspace_model::workspaces(state).len(), 1);
    let snapshot = &state["workspaces"][0]["snapshot"];
    assert_eq!(snapshot["state_version"], PLANNER_SNAPSHOT_VERSION);
    for key in [
        "books",
        "sessions",
        "schedule_completions",
        "last_result",
        "settings",
    ] {
        assert_eq!(snapshot[key], legacy[key], "{key}");
    }
}

#[test]
fn version_zero_and_one_states_migrate_into_default_workspace() {
    for version in [None, Some(PLANNER_SNAPSHOT_VERSION)] {
        let directory = TestDirectory::new("migrate-legacy");
        let legacy = versioned_state(version);
        let state = migrated_state(&directory.path, &legacy);
        assert_single_default_workspace(&state, &legacy);
        assert_eq!(read_backup(&directory.path), legacy);
    }
}

#[test]
fn pre_workspace_backup_is_written_once() {
    let directory = TestDirectory::new("migrate-backup-once");
    let first = versioned_state(Some(PLANNER_SNAPSHOT_VERSION));
    migrated_state(&directory.path, &first);
    let mut second = first.clone();
    second["books"] = json!([]);
    let state = migrated_state(&directory.path, &second);
    assert_eq!(state["workspaces"][0]["snapshot"]["books"], json!([]));
    assert_eq!(read_backup(&directory.path), first);
}

#[test]
fn loading_a_version_two_state_is_idempotent() {
    let directory = TestDirectory::new("migrate-idempotent");
    let first = migrated_state(&directory.path, &legacy_state());
    let second = load_canonical_state_for_test(&directory.path);
    let third = load_canonical_state_for_test(&directory.path);
    assert_eq!(second.state, first);
    assert_eq!(third.state, first);
    assert_eq!(third.warning_code, None);
}

#[test]
fn app_preferences_are_lifted_and_merged_back() {
    let directory = TestDirectory::new("migrate-preferences");
    let state = migrated_state(&directory.path, &legacy_state());
    assert_eq!(state[KEY_APP_PREFERENCES], legacy_state()["preferences"]);
    assert_eq!(state[KEY_FEATURE_FLAGS], json!({ "kobo": true }));
    let snapshot = &state["workspaces"][0]["snapshot"];
    assert_eq!(snapshot["preferences"], json!({}));
    assert!(snapshot.get(KEY_FEATURE_FLAGS).is_none());
    let projected = workspace_model::project_snapshot(&state, &state["workspaces"][0]);
    assert_eq!(projected["preferences"], legacy_state()["preferences"]);
    assert_eq!(projected[KEY_FEATURE_FLAGS], json!({ "kobo": true }));
}

#[test]
fn one_daily_goal_covers_every_workspace() {
    let directory = TestDirectory::new("migrate-goal");
    migrated_state(&directory.path, &legacy_state());
    let second_id = create_named(&directory.path, SECOND_WORKSPACE_NAME);
    let mut second_snapshot = legacy_state();
    second_snapshot["books"] = json!([]);
    second_snapshot["preferences"] =
        json!({ "dailyGoalMinutes": SECOND_GOAL_MINUTES, "theme": "light" });
    save_snapshot(
        &directory.path,
        &save_request(Some(&second_id), second_snapshot),
    )
    .expect("expected second save");
    let default_load = load(&directory.path, DEFAULT_WORKSPACE_ID).expect("expected load");
    let preferences = &default_load.state["preferences"];
    assert_eq!(preferences["dailyGoalMinutes"], SECOND_GOAL_MINUTES);
    assert_eq!(preferences["theme"], "light");
    let second = stored_snapshot(&directory.path, &second_id);
    assert_eq!(second["preferences"], json!({}));
}

#[test]
fn unsupported_state_version_is_rejected_with_guidance() {
    let directory = TestDirectory::new("migrate-version-three");
    let mut state = legacy_state();
    state["state_version"] = json!(APP_STATE_VERSION + 1);
    let payload = archive_payload(&state);
    let message = import_archive_json_for_test(&directory.path, &payload)
        .map(|_| ())
        .expect_err("expected unsupported version");
    assert!(
        message.contains("Unsupported saved state version: 3"),
        "{message}"
    );
    assert!(message.contains("Update Bartleby"), "{message}");
}

#[test]
fn newer_saved_state_blocks_writes_instead_of_resetting() {
    let directory = TestDirectory::new("migrate-downgrade-guard");
    let mut state = legacy_state();
    state["state_version"] = json!(APP_STATE_VERSION + 1);
    save_state_to_directory(&directory.path, &state).expect("expected seeded newer state");
    let load_result = load_canonical_state_for_test(&directory.path);
    assert_eq!(load_result.warning_code, Some("STATE_WRITE_BLOCKED"));
    let error = save_snapshot(&directory.path, &save_request(None, legacy_state()))
        .expect_err("expected the save to be refused");
    assert!(error.contains("Unsupported saved state version"), "{error}");
    let stored = load_canonical_state_for_test(&directory.path);
    assert_eq!(stored.warning_code, Some("STATE_WRITE_BLOCKED"));
    let json_path = crate::state_store::paths::json_state_path(&directory.path);
    let persisted: Value = serde_json::from_str(
        &fs::read_to_string(json_path).expect("expected JSON compatibility copy"),
    )
    .expect("expected JSON state");
    assert_eq!(persisted["state_version"], json!(APP_STATE_VERSION + 1));
}
