use serde_json::{json, Value};

use super::generate_plan;

const HIGH_PRIORITY: i64 = 500;
const HIGHEST_PRIORITY: i64 = 1;
const LONG_REMAINING_WORDS: i64 = 3000;
const MAX_BLOCKS_PER_BOOK_PER_DAY: i64 = 100;
const MAX_BOOKS_PER_DAY: i64 = 1;
const MAX_SESSIONS_PER_DAY: i64 = 1;
const MIN_BLOCKS_PER_SESSION: i64 = 1;
const MINUTES_PER_SINGLE_BLOCK_DAY: i64 = 5;
const MONDAY_DATE: &str = "2026-05-18";
const SHORT_REMAINING_WORDS: i64 = 500;
const WPM_BASE: i64 = 100;

fn planner_settings(start_date: &str, end_date: &str, minutes_per_day: i64) -> Value {
    json!({
        "end_date": end_date,
        "max_blocks_per_book_per_day": MAX_BLOCKS_PER_BOOK_PER_DAY,
        "max_books_per_day": MAX_BOOKS_PER_DAY,
        "max_sessions_per_day": MAX_SESSIONS_PER_DAY,
        "minutes_per_day": minutes_per_day,
        "start_date": start_date,
        "time_quantum_minutes": MINUTES_PER_SINGLE_BLOCK_DAY,
        "wpm_base": WPM_BASE,
    })
}

fn book(book_id: &str, title: &str, priority: i64, remaining_words: i64) -> Value {
    json!({
        "book_id": book_id,
        "min_blocks_per_session": MIN_BLOCKS_PER_SESSION,
        "priority": priority,
        "remaining_words": remaining_words,
        "scheduled_days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "title": title,
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

#[test]
fn equal_priority_prefers_fewer_remaining_words() {
    let generated = generate_plan(json!({
        "books": [
            book("long", "Long", HIGHEST_PRIORITY, LONG_REMAINING_WORDS),
            book("short", "Short", HIGHEST_PRIORITY, SHORT_REMAINING_WORDS),
        ],
        "settings": planner_settings(
            MONDAY_DATE,
            MONDAY_DATE,
            MINUTES_PER_SINGLE_BLOCK_DAY
        ),
    }))
    .expect("expected generated plan");

    assert_eq!(first_schedule_book_id(&generated), Some("short"));
}

#[test]
fn priority_accepts_values_above_legacy_five_point_scale() {
    let generated = generate_plan(json!({
        "books": [
            book("fine-grained", "Fine Grained", HIGH_PRIORITY, SHORT_REMAINING_WORDS),
        ],
        "settings": planner_settings(
            MONDAY_DATE,
            MONDAY_DATE,
            MINUTES_PER_SINGLE_BLOCK_DAY
        ),
    }))
    .expect("expected generated plan");

    assert_eq!(first_schedule_book_id(&generated), Some("fine-grained"));
}
