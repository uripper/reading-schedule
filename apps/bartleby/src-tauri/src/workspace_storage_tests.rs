//! Storage regression tests for workspaces: cover cleanup, archives, and journal replay.
use std::fs;
use std::path::{Path, PathBuf};

use base64::{engine::general_purpose::STANDARD, Engine as _};
use rusqlite::Connection;
use serde_json::{json, Value};

use crate::app_paths::canonical_cover_directory;
use crate::data_archive::{export_archive_json_for_test, import_archive_json_for_test};
use crate::state_store::paths::sqlite_state_path;
use crate::state_store::{load_canonical_state_for_test, run_state_maintenance};
use crate::workspace_model::{self, APP_STATE_VERSION, DEFAULT_WORKSPACE_ID};
use crate::workspaces::test_support::{
    book, planner_snapshot, seed_two, stored_book, stored_state, TestDirectory,
    SECOND_WORKSPACE_NAME, TODAY,
};

const SHA256_HEX_LENGTH: usize = 64;
const ARCHIVE_FORMAT_VERSION: i64 = 1;
const CORRUPT_SNAPSHOT_SQL: &str =
    "UPDATE planner_state_snapshot SET payload_json = '{broken-json' WHERE id = 1";
const DELETE_SNAPSHOT_SQL: &str = "DELETE FROM planner_state_snapshot WHERE id = 1";

/// Builds a data archive whose only file is `planner_state.json` holding `state`.
pub fn archive_payload(state: &Value) -> String {
    let state_bytes = serde_json::to_vec(state).expect("expected state JSON");
    json!({
        "createdAt": "2026-06-10T00:00:00Z",
        "directories": [],
        "files": [{ "bytesBase64": STANDARD.encode(state_bytes), "path": "planner_state.json" }],
        "formatVersion": ARCHIVE_FORMAT_VERSION,
    })
    .to_string()
}

/// Writes a file named like a normalized canonical cover so maintenance leaves it as is.
fn canonical_cover(directory: &Path, hex_digit: char) -> PathBuf {
    let cover_directory = canonical_cover_directory(directory).expect("cover directory");
    let file_name = format!(
        "cover-{}.jpg",
        hex_digit.to_string().repeat(SHA256_HEX_LENGTH)
    );
    let cover_path = cover_directory.join(file_name);
    fs::write(&cover_path, b"cover").expect("expected cover file");
    cover_path
}

fn book_with_cover(book_id: &str, cover_path: &Path) -> Value {
    let mut record = book(book_id, "Dune");
    record["cover_local_path"] = json!(cover_path.to_string_lossy());
    record
}

fn two_workspace_directory(name: &str) -> (TestDirectory, String) {
    let directory = TestDirectory::new(name);
    let source = planner_snapshot(vec![book("book-a", "Dune")]);
    let target = planner_snapshot(vec![book("book-b", "Emma")]);
    let target_id = seed_two(&directory.path, source, target);
    (directory, target_id)
}

fn break_snapshot_row(directory: &Path, statement: &str) {
    let database = Connection::open(sqlite_state_path(directory)).expect("expected database");
    database
        .execute(statement, [])
        .expect("expected snapshot change");
}

#[test]
fn maintenance_keeps_covers_of_inactive_workspaces() {
    let directory = TestDirectory::new("covers");
    let active_cover = canonical_cover(&directory.path, 'a');
    let inactive_cover = canonical_cover(&directory.path, 'b');
    let orphan_cover = canonical_cover(&directory.path, 'c');
    let source = planner_snapshot(vec![book_with_cover("book-a", &active_cover)]);
    let target = planner_snapshot(vec![book_with_cover("book-b", &inactive_cover)]);
    seed_two(&directory.path, source, target);
    let result = run_state_maintenance(&directory.path).expect("expected maintenance");
    assert_eq!(result.covers_deleted, 1);
    assert!(active_cover.is_file());
    assert!(inactive_cover.is_file());
    assert!(!orphan_cover.exists());
}

#[test]
fn archive_round_trip_preserves_every_workspace() {
    let (source, target_id) = two_workspace_directory("archive-round-trip-source");
    let payload = export_archive_json_for_test(&source.path).expect("expected export");
    let destination = TestDirectory::new("archive-round-trip-target");
    let result = import_archive_json_for_test(&destination.path, &payload).expect("import");
    assert_eq!(result.books_restored, 1);
    let state = stored_state(&destination.path);
    assert_eq!(workspace_model::workspaces(&state).len(), 2);
    let target = workspace_model::find_workspace(&state, &target_id).expect("target");
    assert_eq!(target["name"], SECOND_WORKSPACE_NAME);
    assert!(stored_book(&destination.path, DEFAULT_WORKSPACE_ID, "book-a").is_some());
    assert!(stored_book(&destination.path, &target_id, "book-b").is_some());
}

#[test]
fn importing_a_legacy_archive_yields_version_two_state() {
    let directory = TestDirectory::new("archive-legacy");
    let payload = archive_payload(&json!({
        "books": [book("book-a", "Dune")],
        "settings": { "start_date": TODAY },
        "state_version": 1,
    }));
    let result = import_archive_json_for_test(&directory.path, &payload).expect("import");
    assert_eq!(result.books_restored, 1);
    let state = stored_state(&directory.path);
    assert_eq!(state["state_version"], APP_STATE_VERSION);
    assert_eq!(state["active_workspace_id"], DEFAULT_WORKSPACE_ID);
    assert!(stored_book(&directory.path, DEFAULT_WORKSPACE_ID, "book-a").is_some());
}

#[test]
fn journal_replay_recovers_workspace_state() {
    for statement in [CORRUPT_SNAPSHOT_SQL, DELETE_SNAPSHOT_SQL] {
        let (directory, target_id) = two_workspace_directory("journal");
        let before = stored_state(&directory.path);
        break_snapshot_row(&directory.path, statement);
        let load_result = load_canonical_state_for_test(&directory.path);
        assert_eq!(load_result.source, "sqlite_journal_replay");
        assert_eq!(load_result.state, before);
        assert!(workspace_model::find_workspace(&load_result.state, &target_id).is_some());
    }
}
