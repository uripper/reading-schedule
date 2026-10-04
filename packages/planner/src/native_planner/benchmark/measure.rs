//! Times actual parse, greedy solve and report steps, excluding random generation.

use std::hint::black_box;
use std::time::{Duration, Instant};

use serde_json::Value;

use super::config::Config;
use super::data::payload;
use crate::native_planner::{parse, profile, report};

pub(super) const ONE_SECOND: Duration = Duration::from_secs(1);
pub(super) const STOP_TIME: Duration = Duration::from_secs(10);
const WARMUP_BOOKS: usize = 10;

/// Measured work and actual plan counts from a completed production planner run.
#[derive(Clone, Debug, Default)]
pub(super) struct Measurement {
    pub input_books: usize,
    pub assigned_books: usize,
    pub finished_books: usize,
    pub sessions: usize,
    pub samples: usize,
    pub greedy_time: Duration,
    pub parse_time: Duration,
    pub report_time: Duration,
    pub total_time: Duration,
}

/// Discards one small plan to initialize code and allocation paths before measuring.
pub(super) fn warm_up(config: &Config) -> Result<(), String> {
    measure_once(payload(config, WARMUP_BOOKS)?)?;
    Ok(())
}

/// Uses the slowest time across repetitions and stops repeating on a ten-second run.
pub(super) fn measure(config: &Config, count: usize) -> Result<Measurement, String> {
    let generated = payload(config, count)?;
    let mut result = Measurement {
        input_books: count,
        ..Measurement::default()
    };
    while result.samples < config.samples && result.greedy_time <= STOP_TIME {
        // Payload ownership is transferred at the same boundary as the desktop API.
        // Cloning test data is setup work and is deliberately outside the timer.
        let sample = measure_once(generated.clone())?;
        result.add_sample(&sample);
    }
    Ok(result)
}

/// Keeps production parsing, cancellation checks and report generation intact.
fn measure_once(payload: Value) -> Result<Measurement, String> {
    let started = Instant::now();
    let input = parse::planner_input(black_box(payload))?;
    let parse_time = started.elapsed();
    let solve_started = Instant::now();
    let plan = profile::solve(black_box(&input.books), &input.settings, &|| false)?;
    let greedy_time = solve_started.elapsed();
    let report_started = Instant::now();
    let output = black_box(report::build_output(&input.books, &input.settings, &plan)?);
    let report_time = report_started.elapsed();
    let total_time = started.elapsed();
    let mut result = counts(&output)?;
    result.parse_time = parse_time;
    result.greedy_time = greedy_time;
    result.report_time = report_time;
    result.total_time = total_time;
    Ok(result)
}

/// Reads actual assignment totals after timing rather than assuming all books fit.
fn counts(output: &Value) -> Result<Measurement, String> {
    let books = output["summary"]["per_book"]
        .as_object()
        .ok_or_else(|| "Planner report is missing per-book totals.".to_string())?;
    let sessions = output["schedule"]
        .as_array()
        .ok_or_else(|| "Planner report is missing reading sessions.".to_string())?;
    Ok(Measurement {
        input_books: books.len(),
        assigned_books: books
            .values()
            .filter(|book| book["planned_words"].as_i64().unwrap_or(0) > 0)
            .count(),
        finished_books: books
            .values()
            .filter(|book| book["finished"] == true)
            .count(),
        sessions: sessions.len(),
        samples: 1,
        ..Measurement::default()
    })
}

impl Measurement {
    /// Tracks conservative times while retaining actual work counts from the plan.
    fn add_sample(&mut self, sample: &Self) {
        self.assigned_books = sample.assigned_books;
        self.finished_books = sample.finished_books;
        self.sessions = sample.sessions;
        self.samples += 1;
        self.parse_time = self.parse_time.max(sample.parse_time);
        self.greedy_time = self.greedy_time.max(sample.greedy_time);
        self.report_time = self.report_time.max(sample.report_time);
        self.total_time = self.total_time.max(sample.total_time);
    }
}
