use serde_json::{json, Value};

use super::generate_plan;

const FINAL_FRAGMENT_WORDS: i64 = 100;
const HIGHEST_PRIORITY: i64 = 1;
const LOWEST_PRIORITY: i64 = 5;
const MAX_BLOCKS_PER_BOOK_PER_DAY: i64 = 100;
const MAX_BOOKS_PER_DAY: i64 = 1;
const MAX_SESSIONS_PER_DAY: i64 = 1;
const MINUTES_FOR_ONE_BLOCK: i64 = 5;
const MINUTES_PER_SINGLE_BLOCK_DAY: i64 = 5;
const MONDAY_DATE: &str = "2026-05-18";
const THREE_BLOCK_MINIMUM: i64 = 3;
const WORDS_FOR_ONE_BLOCK: i64 = 500;
const WORDS_TOTAL: i64 = 1000;
const WPM_BASE: i64 = 100;

fn planner_settings(start_date: &str, end_date: &str, minutes_per_day: i64) -> Value {
    json!({
        "end_date": end_date,
        "max_blocks_per_book_per_day": MAX_BLOCKS_PER_BOOK_PER_DAY,
        "max_books_per_day": MAX_BOOKS_PER_DAY,
        "max_sessions_per_day": MAX_SESSIONS_PER_DAY,
        "minutes_per_day": minutes_per_day,
        "start_date": start_date,
        "time_quantum_minutes": MINUTES_FOR_ONE_BLOCK,
        "wpm_base": WPM_BASE,
    })
}

fn book(book_id: &str, title: &str, priority: i64, remaining_words: i64) -> Value {
    json!({
        "book_id": book_id,
        "min_blocks_per_session": 1,
        "priority": priority,
        "remaining_words": remaining_words,
        "scheduled_days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "title": title,
        "words_total": WORDS_TOTAL,
    })
}

fn first_schedule_book_id(generated: &Value) -> Option<&str> {
    generated
        .get("schedule")
        .and_then(Value::as_array)
        .and_then(|rows| rows.first())
        .and_then(|row| row.get("book_id"))
        .and_then(Value::as_str)
}

fn summary_status(generated: &Value) -> Option<&str> {
    generated
        .get("summary")
        .and_then(|summary| summary.get("status"))
        .and_then(Value::as_str)
}

#[test]
fn lower_numeric_priority_schedules_first() {
    let generated = generate_plan(json!({
        "books": [
            book("low-number", "Urgent", HIGHEST_PRIORITY, WORDS_FOR_ONE_BLOCK),
            book("high-number", "Later", LOWEST_PRIORITY, WORDS_FOR_ONE_BLOCK),
        ],
        "settings": planner_settings(
            MONDAY_DATE,
            MONDAY_DATE,
            MINUTES_PER_SINGLE_BLOCK_DAY
        ),
    }))
    .expect("expected generated plan");

    assert_eq!(first_schedule_book_id(&generated), Some("low-number"));
}

#[test]
fn final_fragment_can_be_smaller_than_minimum_session_blocks() {
    let mut final_book = book(
        "final-fragment",
        "Almost Done",
        HIGHEST_PRIORITY,
        FINAL_FRAGMENT_WORDS,
    );
    final_book
        .as_object_mut()
        .expect("expected book object")
        .insert(
            "min_blocks_per_session".to_string(),
            Value::from(THREE_BLOCK_MINIMUM),
        );
    let generated = generate_plan(json!({
        "books": [final_book],
        "settings": planner_settings(
            MONDAY_DATE,
            MONDAY_DATE,
            MINUTES_PER_SINGLE_BLOCK_DAY
        ),
    }))
    .expect("expected generated plan");
    let rows = generated
        .get("schedule")
        .and_then(Value::as_array)
        .expect("expected schedule rows");

    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].get("finish").and_then(Value::as_bool), Some(true));
}

#[test]
fn incomplete_plan_reports_incomplete_status() {
    let mut unscheduled_book = book(
        "off-day",
        "Wrong Day",
        HIGHEST_PRIORITY,
        WORDS_FOR_ONE_BLOCK,
    );
    unscheduled_book
        .as_object_mut()
        .expect("expected book object")
        .insert("scheduled_days".to_string(), json!(["Tue"]));
    let generated = generate_plan(json!({
        "books": [unscheduled_book],
        "settings": planner_settings(
            MONDAY_DATE,
            MONDAY_DATE,
            MINUTES_PER_SINGLE_BLOCK_DAY
        ),
    }))
    .expect("expected generated plan");
    let warning = generated
        .get("summary")
        .and_then(|summary| summary.get("feasibility_warning"))
        .and_then(Value::as_str)
        .unwrap_or("");

    assert_eq!(summary_status(&generated), Some("INCOMPLETE"));
    assert!(warning.contains("Wrong Day"));
}
