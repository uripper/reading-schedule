use std::env;
use std::fs;

use rusqlite::Connection;
use serde_json::json;
use uuid::Uuid;

use super::paths::sqlite_state_path;
use super::sqlite_store::{
    maintain_sqlite_storage, read_state_from_sqlite, read_state_from_sqlite_read_only_result,
    write_state_to_sqlite,
};

const EXPECTED_JOURNAL_ROWS: i64 = 5;
const EXTRA_WRITES: i64 = 3;

fn temp_state_directory() -> std::path::PathBuf {
    env::temp_dir().join(format!("bartleby-state-sqlite-{}", Uuid::new_v4()))
}

#[test]
fn sqlite_store_round_trips_state() {
    let data_directory = temp_state_directory();
    let state = json!({ "books": [], "settings": { "start_date": "2026-01-01" } });
    write_state_to_sqlite(&data_directory, &state).expect("expected sqlite write");
    let load_result = read_state_from_sqlite(&data_directory).expect("expected sqlite state");
    assert_eq!(load_result.source, "sqlite");
    let _ = fs::remove_dir_all(&data_directory);
}

#[test]
fn sqlite_store_reads_existing_state_read_only() {
    let data_directory = temp_state_directory();
    let state = json!({ "books": [], "settings": { "start_date": "2026-01-01" } });
    write_state_to_sqlite(&data_directory, &state).expect("expected sqlite write");
    let load_result = read_state_from_sqlite_read_only_result(&data_directory)
        .expect("expected read-only sqlite result")
        .expect("expected read-only sqlite state");
    assert_eq!(load_result.source, "sqlite");
    let _ = fs::remove_dir_all(&data_directory);
}

#[test]
fn sqlite_store_repairs_legacy_lone_surrogates() {
    let data_directory = temp_state_directory();
    fs::create_dir_all(&data_directory).expect("expected sqlite directory");
    let database =
        Connection::open(sqlite_state_path(&data_directory)).expect("expected sqlite database");
    database
        .execute_batch(
            "
            CREATE TABLE planner_state_snapshot (
              id INTEGER PRIMARY KEY CHECK(id = 1),
              schema_version INTEGER NOT NULL,
              payload_json TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            INSERT INTO planner_state_snapshot
              (id, schema_version, payload_json, updated_at)
            VALUES
              (1, 1, '{\"books\":[],\"settings\":{},\"title\":\"Ã\\udc81gua Viva\"}', 'now');
            ",
        )
        .expect("expected legacy sqlite payload");
    let load_result = read_state_from_sqlite_read_only_result(&data_directory)
        .expect("expected read-only sqlite result")
        .expect("expected read-only sqlite state");
    assert_eq!(load_result.state["title"], "Ã�gua Viva");
    let _ = fs::remove_dir_all(&data_directory);
}

#[test]
fn sqlite_store_recovers_from_journal() {
    let data_directory = temp_state_directory();
    write_state_to_sqlite(
        &data_directory,
        &json!({ "books": [], "revision": 1, "settings": { "start_date": "2026-01-01" } }),
    )
    .expect("expected first sqlite write");
    write_state_to_sqlite(
        &data_directory,
        &json!({ "books": [], "revision": 2, "settings": { "start_date": "2026-01-02" } }),
    )
    .expect("expected second sqlite write");
    let database =
        Connection::open(sqlite_state_path(&data_directory)).expect("expected sqlite database");
    database
        .execute(
            "UPDATE planner_state_snapshot SET payload_json = '{broken-json' WHERE id = 1",
            [],
        )
        .expect("expected snapshot corruption");
    let load_result =
        read_state_from_sqlite(&data_directory).expect("expected journal replay recovery");
    assert_eq!(load_result.source, "sqlite_journal_replay");
    assert_eq!(load_result.warning_code, Some("RECOVERED_FROM_JOURNAL"));
    let _ = fs::remove_dir_all(&data_directory);
}

#[test]
fn sqlite_store_keeps_small_recovery_journal() {
    let data_directory = temp_state_directory();
    let write_count = EXPECTED_JOURNAL_ROWS + EXTRA_WRITES;
    for revision in 0..write_count {
        write_state_to_sqlite(
            &data_directory,
            &json!({
                "books": [],
                "revision": revision,
                "settings": { "start_date": "2026-01-01" }
            }),
        )
        .expect("expected sqlite write");
    }
    let database =
        Connection::open(sqlite_state_path(&data_directory)).expect("expected sqlite database");
    let row_count = database
        .query_row("SELECT COUNT(*) FROM planner_state_journal", [], |row| {
            row.get::<_, i64>(0)
        })
        .expect("expected journal row count");
    assert_eq!(row_count, EXPECTED_JOURNAL_ROWS);
    let _ = fs::remove_dir_all(&data_directory);
}

#[test]
fn sqlite_maintenance_trims_legacy_extra_journal_rows() {
    let data_directory = temp_state_directory();
    write_state_to_sqlite(
        &data_directory,
        &json!({ "books": [], "settings": { "start_date": "2026-01-01" } }),
    )
    .expect("expected sqlite write");
    {
        let database =
            Connection::open(sqlite_state_path(&data_directory)).expect("expected sqlite database");
        for revision in 0..(EXPECTED_JOURNAL_ROWS + EXTRA_WRITES) {
            database
                .execute(
                    "
                    INSERT INTO planner_state_journal (created_at, operation, payload_json)
                    VALUES ('now', 'legacy_extra', ?)
                    ",
                    [json!({ "revision": revision }).to_string()],
                )
                .expect("expected legacy journal row");
        }
    }
    let deleted_rows =
        maintain_sqlite_storage(&data_directory).expect("expected sqlite maintenance");
    assert!(deleted_rows > 0);
    let database =
        Connection::open(sqlite_state_path(&data_directory)).expect("expected sqlite database");
    let row_count = database
        .query_row("SELECT COUNT(*) FROM planner_state_journal", [], |row| {
            row.get::<_, i64>(0)
        })
        .expect("expected journal row count");
    assert!(row_count <= EXPECTED_JOURNAL_ROWS);
    let _ = fs::remove_dir_all(&data_directory);
}
