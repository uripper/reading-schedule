use serde_json::{json, Value};

use super::generate_plan;
use super::test_support::{
    book, planner_settings, HIGHEST_PRIORITY, LOWEST_PRIORITY, MINUTES_FOR_ONE_BLOCK, MONDAY_DATE,
    TUESDAY_DATE, WORDS_FOR_ONE_BLOCK,
};

#[test]
fn completed_today_capacity_is_reserved_during_same_day_replan() {
    let mut settings = planner_settings(MONDAY_DATE, TUESDAY_DATE, 10);
    let settings = settings
        .as_object_mut()
        .expect("expected planner settings object");
    settings.insert("max_books_per_day".to_string(), Value::from(2));
    settings.insert("max_sessions_per_day".to_string(), Value::from(2));
    settings.insert(
        "reserved_book_ids_by_date".to_string(),
        json!({ (MONDAY_DATE): ["continuing"] }),
    );
    settings.insert(
        "reserved_minutes_by_date".to_string(),
        json!({ (MONDAY_DATE): 5 }),
    );
    settings.insert(
        "reserved_sessions_by_date".to_string(),
        json!({ (MONDAY_DATE): 1 }),
    );
    let generated = generate_plan(json!({
        "books": [
            book("continuing", "Continuing", HIGHEST_PRIORITY, WORDS_FOR_ONE_BLOCK),
            book("replacement", "Replacement", LOWEST_PRIORITY, WORDS_FOR_ONE_BLOCK),
        ],
        "settings": settings,
    }))
    .expect("expected generated plan");
    let rows = generated
        .get("schedule")
        .and_then(Value::as_array)
        .expect("expected schedule rows");

    assert_eq!(rows.len(), 2);
    assert_row(&rows[0], "replacement", MONDAY_DATE, 2);
    assert_row(&rows[1], "continuing", TUESDAY_DATE, 1);
}

#[test]
fn excluded_books_stay_off_their_day_without_using_a_book_slot() {
    let mut settings = planner_settings(MONDAY_DATE, TUESDAY_DATE, MINUTES_FOR_ONE_BLOCK);
    settings
        .as_object_mut()
        .expect("expected planner settings object")
        .insert(
            "excluded_book_ids_by_date".to_string(),
            json!({ (MONDAY_DATE): ["removed"] }),
        );
    let rows = schedule_rows(json!({
        "books": [
            book("removed", "Removed", HIGHEST_PRIORITY, WORDS_FOR_ONE_BLOCK),
            book("other", "Other", LOWEST_PRIORITY, WORDS_FOR_ONE_BLOCK),
        ],
        "settings": settings,
    }));

    assert_eq!(rows.len(), 2);
    assert_row(&rows[0], "other", MONDAY_DATE, 1);
    assert_row(&rows[1], "removed", TUESDAY_DATE, 1);
}

#[test]
fn reserved_words_are_not_planned_again() {
    let mut settings = planner_settings(MONDAY_DATE, TUESDAY_DATE, MINUTES_FOR_ONE_BLOCK);
    settings
        .as_object_mut()
        .expect("expected planner settings object")
        .insert(
            "reserved_words_by_book_id".to_string(),
            json!({ "partly": WORDS_FOR_ONE_BLOCK }),
        );
    let rows = schedule_rows(json!({
        "books": [book("partly", "Partly", HIGHEST_PRIORITY, 2 * WORDS_FOR_ONE_BLOCK)],
        "settings": settings,
    }));

    assert_eq!(rows.len(), 1);
    assert_row(&rows[0], "partly", MONDAY_DATE, 1);
}

fn schedule_rows(payload: Value) -> Vec<Value> {
    generate_plan(payload)
        .expect("expected generated plan")
        .get("schedule")
        .and_then(Value::as_array)
        .cloned()
        .expect("expected schedule rows")
}

fn assert_row(row: &Value, book_id: &str, date: &str, session_index: i64) {
    assert_eq!(row.get("book_id").and_then(Value::as_str), Some(book_id));
    assert_eq!(row.get("date").and_then(Value::as_str), Some(date));
    assert_eq!(
        row.get("session_index").and_then(Value::as_i64),
        Some(session_index)
    );
}
