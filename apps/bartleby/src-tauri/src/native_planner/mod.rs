mod calendar;
mod coerce;
mod models;
mod parse;
mod report;
mod solve;
mod validate;
mod word_stats;

use serde_json::{json, Value};

const BOOKS_SAMPLE_JSON: &str = include_str!("../../../../../data/books.sample.json");
const SETTINGS_SAMPLE_JSON: &str = include_str!("../../../../../data/settings.json");

pub fn generate_plan(payload: Value) -> Result<Value, String> {
    let planner_input = parse::planner_input(payload)?;
    let result = solve::solve(&planner_input.books, &planner_input.settings)?;
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
    use serde_json::Value;

    use super::{generate_plan, sample_payload};

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
}
