//! Covers the load-sized planning horizon used when no end date is given.

use chrono::NaiveDate;
use serde_json::{Map, Value};

use super::generate_plan;
use super::test_support::{
    book, planner_settings, HIGHEST_PRIORITY, MINUTES_PER_SINGLE_BLOCK_DAY, MONDAY_DATE,
    WORDS_FOR_ONE_BLOCK,
};

const DAYS_PER_YEAR: i64 = 365;
/// A dated override far past any real reading plan, as imported data may hold.
const FAR_FUTURE_OVERRIDE_DATE: &str = "9999-12-31";
const BREAK_YEARS: i64 = 3;
/// Generous bound on days walked once reading stalls: two years of ordinary days.
const MAX_STALLED_YEARS: i64 = 2;
const CAPPED_PLAN_DAYS: i64 = 30;
const LOAD_YEARS: i64 = 12;
const OLD_FIXED_HORIZON_YEARS: i64 = 10;
/// The planner's safety ceiling for open-ended plans, in years.
const MAX_PLAN_YEARS: i64 = 500;
/// A word count no reader could finish within the safety ceiling.
const ABSURD_REMAINING_WORDS: i64 = i64::MAX / 2;
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

fn start_date() -> NaiveDate {
    NaiveDate::parse_from_str(MONDAY_DATE, "%Y-%m-%d").expect("expected date")
}

fn set_setting(settings: &mut Value, field: &str, value: Value) {
    settings
        .as_object_mut()
        .expect("expected settings object")
        .insert(field.to_string(), value);
}

fn summary_number(generated: &Value, field: &str) -> i64 {
    generated
        .get("summary")
        .and_then(|summary| summary.get(field))
        .and_then(Value::as_i64)
        .expect("expected numeric summary field")
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
    let elapsed_days = (last_scheduled_date(&generated) - start_date()).num_days();

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

#[test]
fn absurd_word_count_ends_as_incomplete_plan_within_ceiling() {
    let generated = generate_plan(serde_json::json!({
        "books": [book_with(&[
            ("remaining_words", ABSURD_REMAINING_WORDS),
            ("words_total", ABSURD_REMAINING_WORDS),
        ])],
        "settings": settings_without_end_date(),
    }))
    .expect("expected generated plan");
    let elapsed_days = (last_scheduled_date(&generated) - start_date()).num_days();

    assert_eq!(summary_status(&generated), Some("INCOMPLETE"));
    assert!(elapsed_days < (DAYS_PER_YEAR + 1) * MAX_PLAN_YEARS);
}

#[test]
fn far_future_override_does_not_extend_an_unschedulable_plan() {
    let mut settings = settings_without_end_date();
    set_setting(
        &mut settings,
        "days_off",
        serde_json::json!([FAR_FUTURE_OVERRIDE_DATE]),
    );
    let generated = generate_plan(serde_json::json!({
        "books": [book_with(&[("max_minutes_per_day", SUB_BLOCK_DAILY_MINUTES)])],
        "settings": settings,
    }))
    .expect("expected generated plan");
    let walked_minutes_bound = MINUTES_PER_SINGLE_BLOCK_DAY * DAYS_PER_YEAR * MAX_STALLED_YEARS;

    assert_eq!(summary_status(&generated), Some("INCOMPLETE"));
    assert!(summary_number(&generated, "total_available_minutes") < walked_minutes_bound);
}

#[test]
fn multi_year_break_still_schedules_reading_after_it() {
    let break_end = start_date() + chrono::Days::new((DAYS_PER_YEAR * BREAK_YEARS) as u64);
    let days_off = start_date()
        .iter_days()
        .take_while(|day| *day < break_end)
        .map(|day| day.format("%Y-%m-%d").to_string())
        .collect::<Vec<_>>();
    let mut settings = settings_without_end_date();
    set_setting(&mut settings, "days_off", serde_json::json!(days_off));
    let generated = generate_plan(serde_json::json!({
        "books": [book_with(&[])],
        "settings": settings,
    }))
    .expect("expected generated plan");

    assert_eq!(summary_status(&generated), Some("FEASIBLE"));
    assert_eq!(last_scheduled_date(&generated), break_end);
}

#[test]
fn capped_plan_reports_availability_through_end_date() {
    let end_date = start_date() + chrono::Days::new(CAPPED_PLAN_DAYS as u64);
    let settings = planner_settings(
        MONDAY_DATE,
        &end_date.format("%Y-%m-%d").to_string(),
        MINUTES_PER_SINGLE_BLOCK_DAY,
    );
    let generated = generate_plan(serde_json::json!({
        "books": [book_with(&[])],
        "settings": settings,
    }))
    .expect("expected generated plan");
    let planned_days = CAPPED_PLAN_DAYS + 1;

    assert_eq!(last_scheduled_date(&generated), start_date());
    assert_eq!(
        summary_number(&generated, "total_available_minutes"),
        MINUTES_PER_SINGLE_BLOCK_DAY * planned_days
    );
}
