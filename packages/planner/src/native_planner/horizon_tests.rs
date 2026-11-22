//! Covers the load-sized planning horizon used when no end date is given.

use chrono::NaiveDate;
use serde_json::{Map, Value};

use super::generate_plan;
use super::test_support::{
    book, planner_settings, HIGHEST_PRIORITY, MINUTES_PER_SINGLE_BLOCK_DAY, MONDAY_DATE,
    WORDS_FOR_ONE_BLOCK,
};

const DAYS_PER_YEAR: i64 = 365;
const LOAD_YEARS: i64 = 12;
const OLD_FIXED_HORIZON_YEARS: i64 = 10;
/// Below one 5-minute block, so the book can never receive reading time.
const SUB_BLOCK_DAILY_MINUTES: i64 = 1;

fn settings_without_end_date() -> Value {
    let mut settings = planner_settings(MONDAY_DATE, MONDAY_DATE, MINUTES_PER_SINGLE_BLOCK_DAY);
    settings
        .as_object_mut()
        .expect("expected settings object")
        .remove("end_date");
    settings
}

fn book_with(fields: &[(&str, i64)]) -> Value {
    let mut value = book(
        "long-book",
        "Long Book",
        HIGHEST_PRIORITY,
        WORDS_FOR_ONE_BLOCK,
    );
    let object: &mut Map<String, Value> = value.as_object_mut().expect("expected book object");
    for (field, number) in fields {
        object.insert((*field).to_string(), Value::from(*number));
    }
    value
}

fn summary_status(generated: &Value) -> Option<&str> {
    generated
        .get("summary")
        .and_then(|summary| summary.get("status"))
        .and_then(Value::as_str)
}

fn last_scheduled_date(generated: &Value) -> NaiveDate {
    generated
        .get("schedule")
        .and_then(Value::as_array)
        .expect("expected schedule rows")
        .iter()
        .filter_map(|row| row.get("date").and_then(Value::as_str))
        .map(|date| NaiveDate::parse_from_str(date, "%Y-%m-%d").expect("expected date"))
        .max()
        .expect("expected at least one session")
}

#[test]
fn load_longer_than_ten_years_is_fully_scheduled_without_end_date() {
    let words = WORDS_FOR_ONE_BLOCK * DAYS_PER_YEAR * LOAD_YEARS;
    let generated = generate_plan(serde_json::json!({
        "books": [book_with(&[("remaining_words", words), ("words_total", words)])],
        "settings": settings_without_end_date(),
    }))
    .expect("expected generated plan");
    let start = NaiveDate::parse_from_str(MONDAY_DATE, "%Y-%m-%d").expect("expected date");
    let elapsed_days = (last_scheduled_date(&generated) - start).num_days();

    assert_eq!(summary_status(&generated), Some("FEASIBLE"));
    assert!(elapsed_days > DAYS_PER_YEAR * OLD_FIXED_HORIZON_YEARS);
}

#[test]
fn unschedulable_load_stops_instead_of_walking_forever() {
    let generated = generate_plan(serde_json::json!({
        "books": [book_with(&[("max_minutes_per_day", SUB_BLOCK_DAILY_MINUTES)])],
        "settings": settings_without_end_date(),
    }))
    .expect("expected generated plan");

    assert_eq!(summary_status(&generated), Some("INCOMPLETE"));
}
