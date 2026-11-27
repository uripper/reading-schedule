//! Book transfer tests: preserved records, history bookkeeping, and validation.
use serde_json::{json, Value};

use super::requests::ShelfPolicy;
use super::test_support::{
    book, planner_snapshot, seed_two, stored_book, stored_needs_replan, stored_revision,
    stored_snapshot, transfer_request, TestDirectory, FUTURE_DAY, LATER_DAY, PAST_DAY, TODAY,
};
use super::{set_archived, transfer_books, TransferOutcome, TransferResult};
use crate::workspace_model::DEFAULT_WORKSPACE_ID;

const REMOVED_ROW_COUNT: usize = 2;
const FIRST_REVISION: u64 = 1;

fn row(date: &str, session_index: u64, book_id: &str) -> Value {
    json!({ "book_id": book_id, "date": date, "minutes": 20, "session_index": session_index })
}

/// Source with history and future plans for `book-a`, plus a staying `book-b`.
fn history_snapshot() -> Value {
    let mut snapshot = planner_snapshot(vec![book("book-a", "Dune"), book("book-b", "Emma")]);
    snapshot["last_result"] = json!({ "schedule": [
        row(PAST_DAY, 0, "book-a"),
        row(TODAY, 0, "book-a"),
        row(FUTURE_DAY, 0, "book-a"),
        row(FUTURE_DAY, 1, "book-a"),
        row(LATER_DAY, 0, "book-a"),
        row(FUTURE_DAY, 0, "book-b"),
    ]});
    snapshot["schedule_completions"] = json!({
        format!("{FUTURE_DAY}|1|book-a"): true,
        format!("{LATER_DAY}|book-a"): true,
        format!("{PAST_DAY}|0|book-a"): true,
    });
    snapshot["sessions"] = json!([{ "book_id": "book-a", "date": PAST_DAY, "minutes": 20 }]);
    snapshot["blocked_day_books"] = json!({
        format!("{PAST_DAY}|book-a"): true,
        format!("{FUTURE_DAY}|book-a"): true,
        format!("{FUTURE_DAY}|book-b"): true,
    });
    snapshot
}

fn moved(result: TransferResult) -> super::transfer::TransferReceipt {
    match result.outcome {
        TransferOutcome::Moved(receipt) => receipt,
        TransferOutcome::Conflict { conflicts } => panic!("unexpected conflicts: {conflicts:?}"),
    }
}

fn schedule_keys(snapshot: &Value) -> Vec<String> {
    let rows = snapshot["last_result"]["schedule"].as_array().cloned();
    rows.unwrap_or_default()
        .iter()
        .map(|row| {
            format!(
                "{}|{}|{}",
                row["date"], row["session_index"], row["book_id"]
            )
        })
        .map(|key| key.replace('"', ""))
        .collect()
}

#[test]
fn single_transfer_preserves_book_record_and_marks_replan() {
    let directory = TestDirectory::new("transfer-single");
    let target_id = seed_two(
        &directory.path,
        history_snapshot(),
        planner_snapshot(vec![]),
    );
    let original = stored_book(&directory.path, DEFAULT_WORKSPACE_ID, "book-a");
    let result = transfer_books(&directory.path, &transfer_request(&target_id, &["book-a"]))
        .expect("expected transfer");
    assert_eq!(moved(result).moved_book_ids, vec!["book-a".to_string()]);
    assert_eq!(stored_book(&directory.path, &target_id, "book-a"), original);
    assert!(stored_book(&directory.path, DEFAULT_WORKSPACE_ID, "book-a").is_none());
    assert!(stored_needs_replan(&directory.path, &target_id));
    assert!(stored_needs_replan(&directory.path, DEFAULT_WORKSPACE_ID));
    assert!(stored_revision(&directory.path, &target_id) > FIRST_REVISION);
    assert!(stored_revision(&directory.path, DEFAULT_WORKSPACE_ID) > FIRST_REVISION);
}

#[test]
fn bulk_transfer_moves_every_book_and_clears_shelves_on_request() {
    let directory = TestDirectory::new("transfer-bulk");
    let target_id = seed_two(
        &directory.path,
        history_snapshot(),
        planner_snapshot(vec![]),
    );
    let mut request = transfer_request(&target_id, &["book-a", "book-b"]);
    request.shelf_policy = ShelfPolicy::Clear;
    transfer_books(&directory.path, &request).expect("expected bulk transfer");
    let moved_book = stored_book(&directory.path, &target_id, "book-b").expect("moved book");
    assert_eq!(moved_book["shelf"], "");
    assert_eq!(moved_book["collections"], json!([]));
    assert_eq!(moved_book["title"], "Emma");
    assert_eq!(moved_book["cover_local_path"], "/covers/book-b.jpg");
    assert_eq!(
        stored_snapshot(&directory.path, DEFAULT_WORKSPACE_ID)["books"],
        json!([])
    );
}

#[test]
fn transfer_keeps_history_in_source_and_drops_future_rows() {
    let directory = TestDirectory::new("transfer-history");
    let target_id = seed_two(
        &directory.path,
        history_snapshot(),
        planner_snapshot(vec![]),
    );
    let result = transfer_books(&directory.path, &transfer_request(&target_id, &["book-a"]))
        .expect("expected transfer");
    assert_eq!(moved(result).removed_schedule_rows, REMOVED_ROW_COUNT);
    let source = stored_snapshot(&directory.path, DEFAULT_WORKSPACE_ID);
    let expected_keys = [
        format!("{PAST_DAY}|0|book-a"),
        format!("{FUTURE_DAY}|1|book-a"),
        format!("{LATER_DAY}|0|book-a"),
        format!("{FUTURE_DAY}|0|book-b"),
    ];
    assert_eq!(schedule_keys(&source), expected_keys);
    assert_eq!(source["sessions"], history_snapshot()["sessions"]);
    assert_eq!(
        source["schedule_completions"],
        history_snapshot()["schedule_completions"]
    );
    let target = stored_snapshot(&directory.path, &target_id);
    assert_eq!(target["sessions"], json!([]));
    assert_eq!(target["schedule_completions"], json!({}));
}

#[test]
fn transfer_moves_only_future_exclusions_of_moved_books() {
    let directory = TestDirectory::new("transfer-exclusions");
    let target_id = seed_two(
        &directory.path,
        history_snapshot(),
        planner_snapshot(vec![]),
    );
    transfer_books(&directory.path, &transfer_request(&target_id, &["book-a"]))
        .expect("expected transfer");
    let source = stored_snapshot(&directory.path, DEFAULT_WORKSPACE_ID);
    let expected_source = json!({
        format!("{PAST_DAY}|book-a"): true,
        format!("{FUTURE_DAY}|book-b"): true,
    });
    assert_eq!(source["blocked_day_books"], expected_source);
    let target = stored_snapshot(&directory.path, &target_id);
    assert_eq!(
        target["blocked_day_books"],
        json!({ format!("{FUTURE_DAY}|book-a"): true })
    );
}

#[test]
fn transfer_rejects_invalid_requests() {
    let directory = TestDirectory::new("transfer-invalid");
    let target_snapshot = planner_snapshot(vec![book("book-b", "Emma")]);
    let target_id = seed_two(&directory.path, history_snapshot(), target_snapshot);
    let cases = [
        (
            transfer_request(DEFAULT_WORKSPACE_ID, &["book-a"]),
            "different destination",
        ),
        (
            transfer_request(&target_id, &["book-z"]),
            "not in the source",
        ),
        (transfer_request(&target_id, &["book-b"]), "already exists"),
        (transfer_request(&target_id, &[]), "at least one"),
        (
            transfer_request("workspace-missing", &["book-a"]),
            "does not exist",
        ),
    ];
    for (request, message) in cases {
        let error = transfer_books(&directory.path, &request).expect_err(message);
        assert!(error.contains(message), "{error}");
    }
    let mut bad_day = transfer_request(&target_id, &["book-a"]);
    bad_day.today = "June 10".to_string();
    assert!(transfer_books(&directory.path, &bad_day).is_err());
}

#[test]
fn transfer_rejects_archived_destination() {
    let directory = TestDirectory::new("transfer-archived");
    let target_id = seed_two(
        &directory.path,
        history_snapshot(),
        planner_snapshot(vec![]),
    );
    set_archived(&directory.path, &target_id, true).expect("expected archive");
    let error = transfer_books(&directory.path, &transfer_request(&target_id, &["book-a"]))
        .expect_err("expected archived reject");
    assert!(error.contains("Restore the destination"));
}

#[test]
fn duplicate_titles_across_workspaces_are_allowed() {
    let directory = TestDirectory::new("transfer-titles");
    let target_snapshot = planner_snapshot(vec![book("book-other", "Dune")]);
    let target_id = seed_two(&directory.path, history_snapshot(), target_snapshot);
    transfer_books(&directory.path, &transfer_request(&target_id, &["book-a"]))
        .expect("expected transfer with duplicate title");
    let books = stored_snapshot(&directory.path, &target_id)["books"].clone();
    let titles: Vec<&Value> = books
        .as_array()
        .into_iter()
        .flatten()
        .map(|entry| &entry["title"])
        .collect();
    assert_eq!(titles, vec![&json!("Dune"), &json!("Dune")]);
}
