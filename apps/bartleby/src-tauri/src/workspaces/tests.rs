//! Lifecycle regression tests: create, rename, archive, restore, delete, and activate.
use serde_json::json;

use super::test_support::activate;
use super::test_support::{
    book, create_named, planner_snapshot, seed_default, seed_two, stored_book, stored_snapshot,
    TestDirectory, SECOND_WORKSPACE_NAME, TODAY,
};
use super::{create, delete, list, load, rename, set_archived};
use super::{CreateRequest, DeleteRequest};
use crate::workspace_model::DEFAULT_WORKSPACE_ID;

const MAX_NAME_CHARS: usize = 80;
const UNKNOWN_WORKSPACE_ID: &str = "workspace-missing";

fn create_request(name: &str, inherit_settings_from: Option<&str>) -> CreateRequest {
    CreateRequest {
        inherit_settings_from: inherit_settings_from.map(str::to_string),
        name: name.to_string(),
    }
}

fn delete_request(workspace_id: &str, transfer_books_to: Option<&str>) -> DeleteRequest {
    DeleteRequest {
        today: TODAY.to_string(),
        transfer_books_to: transfer_books_to.map(str::to_string),
        workspace_id: workspace_id.to_string(),
    }
}

fn seeded(name: &str) -> TestDirectory {
    let directory = TestDirectory::new(name);
    seed_default(
        &directory.path,
        planner_snapshot(vec![book("book-a", "Dune")]),
    );
    directory
}

fn create_error(directory: &TestDirectory, name: &str) -> String {
    create(&directory.path, &create_request(name, None), &json!({}))
        .expect_err("expected invalid workspace name")
}

#[test]
fn create_validates_and_trims_names() {
    let directory = seeded("create-names");
    assert!(create_error(&directory, "   ").contains("Enter a workspace name"));
    let created_id = create_named(&directory.path, "  Work  ");
    let catalog = list(&directory.path).expect("expected catalog");
    let created = catalog
        .workspaces
        .iter()
        .find(|entry| entry.id == created_id);
    assert_eq!(created.map(|entry| entry.name.as_str()), Some("Work"));
    assert!(create_error(&directory, "WORK ").contains("already exists"));
    assert!(create_error(&directory, &"x".repeat(MAX_NAME_CHARS + 1)).contains("at most"));
    create_named(&directory.path, &"x".repeat(MAX_NAME_CHARS));
}

#[test]
fn create_inherits_settings_without_books() {
    let directory = seeded("create-inherit");
    let request = create_request("Copy", Some(DEFAULT_WORKSPACE_ID));
    let created = create(&directory.path, &request, &json!({ "start_date": TODAY }))
        .expect("expected inherited workspace");
    let snapshot = stored_snapshot(&directory.path, &created.workspace_id);
    let source = stored_snapshot(&directory.path, DEFAULT_WORKSPACE_ID);
    assert_eq!(snapshot["settings"], source["settings"]);
    assert_eq!(snapshot["preferences"], json!({}));
    assert_eq!(snapshot["books"], json!([]));
    assert_eq!(snapshot["sessions"], json!([]));
    let fresh = create(
        &directory.path,
        &create_request("Fresh", None),
        &json!({ "a": 1 }),
    )
    .expect("expected default workspace");
    let fresh_snapshot = stored_snapshot(&directory.path, &fresh.workspace_id);
    assert_eq!(fresh_snapshot["settings"], json!({ "a": 1 }));
    assert_eq!(fresh_snapshot["preferences"], json!({}));
}

#[test]
fn rename_trims_and_rejects_duplicates() {
    let directory = seeded("rename");
    let second_id = create_named(&directory.path, SECOND_WORKSPACE_NAME);
    let catalog = rename(&directory.path, &second_id, " Library ").expect("expected rename");
    assert!(catalog
        .workspaces
        .iter()
        .any(|entry| entry.name == "Library"));
    rename(&directory.path, &second_id, "LIBRARY").expect("expected own-name recase");
    let error = rename(&directory.path, &second_id, "my reading").expect_err("expected dup");
    assert!(error.contains("already exists"));
}

#[test]
fn archive_keeps_one_usable_workspace_and_moves_active() {
    let directory = seeded("archive");
    let error = set_archived(&directory.path, DEFAULT_WORKSPACE_ID, true).expect_err("last");
    assert!(error.contains("at least one"));
    let second_id = create_named(&directory.path, SECOND_WORKSPACE_NAME);
    activate(&directory.path, &second_id).expect("expected activation");
    let catalog = set_archived(&directory.path, &second_id, true).expect("expected archive");
    assert_eq!(catalog.active_workspace_id, DEFAULT_WORKSPACE_ID);
    let error = activate(&directory.path, &second_id).expect_err("expected archived reject");
    assert!(error.contains("Restore"));
    let catalog = set_archived(&directory.path, &second_id, false).expect("expected restore");
    let restored = catalog
        .workspaces
        .iter()
        .find(|entry| entry.id == second_id);
    assert_eq!(restored.map(|entry| entry.archived), Some(false));
    activate(&directory.path, &second_id).expect("expected restored activation");
}

#[test]
fn delete_keeps_one_usable_workspace() {
    let directory = seeded("delete-last");
    let error = delete(&directory.path, &delete_request(DEFAULT_WORKSPACE_ID, None))
        .expect_err("expected last workspace reject");
    assert!(error.contains("at least one"));
    let second_id = create_named(&directory.path, SECOND_WORKSPACE_NAME);
    let catalog =
        delete(&directory.path, &delete_request(&second_id, None)).expect("expected delete");
    assert_eq!(catalog.workspaces.len(), 1);
}

#[test]
fn delete_active_with_transfer_moves_books_and_active() {
    let directory = TestDirectory::new("delete-transfer");
    let books = vec![book("book-a", "Dune"), book("book-b", "Emma")];
    let target_id = seed_two(
        &directory.path,
        planner_snapshot(books),
        planner_snapshot(vec![]),
    );
    let request = delete_request(DEFAULT_WORKSPACE_ID, Some(&target_id));
    let catalog = delete(&directory.path, &request).expect("expected delete with transfer");
    assert_eq!(catalog.active_workspace_id, target_id);
    assert_eq!(catalog.workspaces.len(), 1);
    assert!(stored_book(&directory.path, &target_id, "book-a").is_some());
    assert!(stored_book(&directory.path, &target_id, "book-b").is_some());
}

#[test]
fn unknown_workspace_ids_are_rejected() {
    let directory = seeded("unknown-ids");
    for workspace_id in [UNKNOWN_WORKSPACE_ID, ""] {
        assert!(activate(&directory.path, workspace_id).is_err());
        assert!(load(&directory.path, workspace_id).is_err());
        assert!(rename(&directory.path, workspace_id, "Name").is_err());
        assert!(set_archived(&directory.path, workspace_id, true).is_err());
        assert!(delete(&directory.path, &delete_request(workspace_id, None)).is_err());
    }
    let request = create_request("Copy", Some(UNKNOWN_WORKSPACE_ID));
    assert!(create(&directory.path, &request, &json!({})).is_err());
}

#[test]
fn operations_require_saved_data() {
    let directory = TestDirectory::new("no-data");
    let error = list(&directory.path).expect_err("expected missing data");
    assert!(error.contains("no saved data"));
}
