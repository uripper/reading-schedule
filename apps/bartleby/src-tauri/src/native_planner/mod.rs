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
#[cfg(test)]
mod tests;
mod timings;
mod validate;
mod word_stats;

use std::time::Instant;

use serde_json::{json, Value};

pub(crate) use timings::{set_summary_timing, set_summary_timing_flag};

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
    let total_started_at = Instant::now();
    fail_if_cancelled(should_cancel)?;
    let parse_started_at = Instant::now();
    let planner_input = parse::planner_input(payload)?;
    let parse_ms = timings::elapsed_ms(parse_started_at);
    fail_if_cancelled(should_cancel)?;
    let solve_started_at = Instant::now();
    let result = profile::solve(&planner_input.books, &planner_input.settings, should_cancel)?;
    let solve_ms = timings::elapsed_ms(solve_started_at);
    fail_if_cancelled(should_cancel)?;
    let report_started_at = Instant::now();
    let mut output = report::build_output(&planner_input.books, &planner_input.settings, &result)?;
    let report_ms = timings::elapsed_ms(report_started_at);
    set_summary_timing(&mut output, "native_parse_ms", parse_ms);
    set_summary_timing(&mut output, "native_solve_ms", solve_ms);
    set_summary_timing(&mut output, "native_report_ms", report_ms);
    set_summary_timing(
        &mut output,
        "native_total_ms",
        timings::elapsed_ms(total_started_at),
    );
    Ok(output)
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
