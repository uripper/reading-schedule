mod calendar;
mod coerce;
mod greedy_support;
mod models;
mod parse;
mod profile;
#[cfg(test)]
mod regression_tests;
mod report;
mod report_status;
mod solve;
mod validate;
mod word_stats;

use serde_json::{json, Value};

const BOOKS_SAMPLE_JSON: &str = include_str!("../../../../../data/books.sample.json");
const SETTINGS_SAMPLE_JSON: &str = include_str!("../../../../../data/settings.json");

pub(crate) type CancellationCheck<'a> = dyn Fn() -> bool + 'a;
pub(crate) const PLANNER_SUPERSEDED_MESSAGE: &str = "Planner request superseded.";

#[cfg(test)]
fn never_cancel() -> bool {
    false
}

pub(crate) fn fail_if_cancelled(should_cancel: &CancellationCheck<'_>) -> Result<(), String> {
    if should_cancel() {
        return Err(PLANNER_SUPERSEDED_MESSAGE.to_string());
    }
    Ok(())
}

#[cfg(test)]
pub fn generate_plan(payload: Value) -> Result<Value, String> {
    generate_plan_with_cancel(payload, &never_cancel)
}

pub(crate) fn generate_plan_with_cancel(
    payload: Value,
    should_cancel: &CancellationCheck<'_>,
) -> Result<Value, String> {
    fail_if_cancelled(should_cancel)?;
    let planner_input = parse::planner_input(payload)?;
    fail_if_cancelled(should_cancel)?;
    let result = profile::solve(&planner_input.books, &planner_input.settings, should_cancel)?;
    fail_if_cancelled(should_cancel)?;
    report::build_output(&planner_input.books, &planner_input.settings, &result)
}

pub fn sample_payload() -> Result<Value, String> {
    let books: Value = serde_json::from_str(BOOKS_SAMPLE_JSON)
        .map_err(|error| format!("Unable to parse sample books: {error}"))?;
    let settings: Value = serde_json::from_str(SETTINGS_SAMPLE_JSON)
        .map_err(|error| format!("Unable to parse sample settings: {error}"))?;
    Ok(json!({
        "books": books,
        "settings": settings,
    }))
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDate;
    use serde_json::{json, Value};

    use super::{
        calendar::minutes_for_day, generate_plan, generate_plan_with_cancel, parse::planner_input,
        sample_payload, PLANNER_SUPERSEDED_MESSAGE,
    };

    #[test]
    fn generate_plan_returns_schedule_rows() {
        let payload = sample_payload().expect("expected sample payload");
        let generated = generate_plan(payload).expect("expected generated plan");
        let schedule = generated
            .get("schedule")
            .and_then(Value::as_array)
            .expect("expected schedule rows");
        assert!(!schedule.is_empty(), "expected generated schedule rows");
    }

    #[test]
    fn planner_input_uses_minutes_per_day_for_missing_weekdays() {
        let mut payload = sample_payload().expect("expected sample payload");
        let settings = payload
            .get_mut("settings")
            .and_then(Value::as_object_mut)
            .expect("expected settings");
        settings.insert(
            "minutes_by_weekday".to_string(),
            json!({
                "Mon": 60,
            }),
        );
        settings.insert("minutes_per_day".to_string(), Value::Number(45.into()));
        let planner_input = planner_input(payload).expect("expected planner input");
        let monday = NaiveDate::from_ymd_opt(2026, 5, 18).expect("expected Monday date");
        let tuesday = NaiveDate::from_ymd_opt(2026, 5, 19).expect("expected Tuesday date");
        assert_eq!(minutes_for_day(&planner_input.settings, monday), 60);
        assert_eq!(minutes_for_day(&planner_input.settings, tuesday), 45);
    }

    #[test]
    fn planner_input_rejects_invalid_minutes_by_weekday_keys() {
        let mut payload = sample_payload().expect("expected sample payload");
        let settings = payload
            .get_mut("settings")
            .and_then(Value::as_object_mut)
            .expect("expected settings");
        settings.insert(
            "minutes_by_weekday".to_string(),
            json!({
                "Funday": 45,
            }),
        );
        let error = planner_input(payload).expect_err("expected invalid weekday error");
        assert!(
            error.contains("minutes_by_weekday keys must be Mon..Sun when provided"),
            "expected invalid weekday error, got {error}"
        );
    }

    #[test]
    fn generate_plan_rejects_blocker_cycles() {
        let mut payload = sample_payload().expect("expected sample payload");
        let books = payload
            .get_mut("books")
            .and_then(Value::as_array_mut)
            .expect("expected sample books");
        let second_book_id = books
            .get(1)
            .and_then(Value::as_object)
            .and_then(|book| book.get("book_id"))
            .and_then(Value::as_str)
            .expect("expected second book id")
            .to_string();
        let first_book = books
            .get_mut(0)
            .and_then(Value::as_object_mut)
            .expect("expected first book");
        first_book.insert("blocked_by".to_string(), Value::String(second_book_id));
        let second_book = books
            .get_mut(1)
            .and_then(Value::as_object_mut)
            .expect("expected second book");
        second_book.insert(
            "blocked_by".to_string(),
            Value::String("sample-001".to_string()),
        );
        let error = generate_plan(payload).expect_err("expected blocker cycle error");
        assert!(error.contains("cycle"), "expected cycle error, got {error}");
    }

    #[test]
    fn generate_plan_allows_missing_book_id() {
        let mut payload = sample_payload().expect("expected sample payload");
        let books = payload
            .get_mut("books")
            .and_then(Value::as_array_mut)
            .expect("expected books array");
        let first_book = books
            .get_mut(0)
            .and_then(Value::as_object_mut)
            .expect("expected first book");
        first_book.remove("book_id");
        let third_book = books
            .get_mut(2)
            .and_then(Value::as_object_mut)
            .expect("expected third book");
        third_book.insert("blocked_by".to_string(), Value::Null);
        let generated = generate_plan(payload).expect("expected generated plan");
        let first_row = generated
            .get("schedule")
            .and_then(Value::as_array)
            .and_then(|rows| rows.first())
            .and_then(Value::as_object)
            .expect("expected first schedule row");
        assert!(first_row.get("book_id").and_then(Value::as_str).is_some());
    }

    #[test]
    fn generate_plan_uses_fast_profile_note() {
        let mut payload = sample_payload().expect("expected sample payload");
        payload
            .get_mut("settings")
            .and_then(Value::as_object_mut)
            .expect("expected settings")
            .insert(
                "planner_solver_profile".to_string(),
                Value::String("fast".to_string()),
            );
        let generated = generate_plan(payload).expect("expected generated plan");
        let summary = generated
            .get("summary")
            .and_then(Value::as_object)
            .expect("expected summary");
        assert_eq!(
            summary.get("planner").and_then(Value::as_str),
            Some("greedy")
        );
        assert_eq!(
            summary.get("note").and_then(Value::as_str),
            Some("Fast mode uses greedy planner.")
        );
    }

    #[test]
    fn generate_plan_reports_spread_out_deprecation_notice() {
        let mut payload = sample_payload().expect("expected sample payload");
        payload
            .get_mut("settings")
            .and_then(Value::as_object_mut)
            .expect("expected settings")
            .insert(
                "plan_mode".to_string(),
                Value::String("spread_out".to_string()),
            );
        let generated = generate_plan(payload).expect("expected generated plan");
        let summary = generated
            .get("summary")
            .and_then(Value::as_object)
            .expect("expected summary");
        let notice = summary
            .get("deprecation_notice")
            .and_then(Value::as_str)
            .expect("expected deprecation notice");

        assert!(notice.contains("Spread Out mode is deprecated"));
    }

    #[test]
    fn generate_plan_can_be_cancelled_before_solve() {
        let payload = sample_payload().expect("expected sample payload");
        let error = generate_plan_with_cancel(payload, &|| true)
            .expect_err("expected superseded planner error");

        assert_eq!(error, PLANNER_SUPERSEDED_MESSAGE);
    }

    #[test]
    fn generate_plan_treats_balanced_profile_as_fast() {
        let mut payload = sample_payload().expect("expected sample payload");
        payload
            .get_mut("settings")
            .and_then(Value::as_object_mut)
            .expect("expected settings")
            .insert(
                "planner_solver_profile".to_string(),
                Value::String("balanced".to_string()),
            );
        let generated = generate_plan(payload).expect("expected generated plan");
        let summary = generated
            .get("summary")
            .and_then(Value::as_object)
            .expect("expected summary");
        assert_eq!(
            summary.get("planner").and_then(Value::as_str),
            Some("greedy")
        );
        assert_eq!(
            summary.get("note").and_then(Value::as_str),
            Some("Fast mode uses greedy planner.")
        );
    }

    #[test]
    fn generate_plan_treats_thorough_profile_as_fast() {
        let mut payload = sample_payload().expect("expected sample payload");
        payload
            .get_mut("settings")
            .and_then(Value::as_object_mut)
            .expect("expected settings")
            .insert(
                "planner_solver_profile".to_string(),
                Value::String("thorough".to_string()),
            );
        let generated = generate_plan(payload).expect("expected generated plan");
        let summary = generated
            .get("summary")
            .and_then(Value::as_object)
            .expect("expected summary");
        assert_eq!(
            summary.get("planner").and_then(Value::as_str),
            Some("greedy")
        );
        assert_eq!(
            summary.get("note").and_then(Value::as_str),
            Some("Fast mode uses greedy planner.")
        );
    }
}
