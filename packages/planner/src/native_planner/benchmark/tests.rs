//! Regression coverage for synthetic inputs, stopping rules and terminal reporting.

use std::time::Duration;

use serde_json::Value;

use super::config::{Config, BLOCKS_PER_DAY, MAX_YEARS, MINUTES_PER_DAY};
use super::data::payload;
use super::measure::{measure, Measurement, ONE_SECOND, STOP_TIME};
use super::output::{grouped, time_bar};
use super::search::{next_count, Search};
use crate::native_planner::{calendar, parse};

const EXPECTED_DEFAULT_YEARS: u32 = 10;
const TEST_BOOKS: usize = 1000;
const PREFIX_BOOKS: usize = 20;
const DIFFERENT_SEED: u64 = 123;
const FAST_MILLISECONDS: u64 = 900;
const FAST_COUNT: usize = 1000;
const SLOW_COUNT: usize = 2000;
const MIDDLE_COUNT: usize = 1500;
const LIMIT_COUNT: usize = 1750;

fn options(values: &[&str]) -> Vec<String> {
    values.iter().map(|value| (*value).to_string()).collect()
}

#[test]
fn rejects_invalid_and_incomplete_options() {
    let invalid = [
        vec!["--years", "0"],
        vec!["--years", "1001"],
        vec!["--years", "1.5"],
        vec!["--seed", "-1"],
        vec!["--start-books", "0"],
        vec!["--samples", "0"],
        vec!["--samples", "1001"],
        vec!["--max-books", "1"],
        vec!["--years"],
        vec!["--unknown", "1"],
    ];
    for args in invalid {
        assert!(Config::parse(&options(&args)).is_err(), "accepted {args:?}");
    }
    assert!(Config::parse(&options(&["--seed", "0"])).is_ok());
}

#[test]
fn generated_books_are_valid_coherent_and_repeatable() -> Result<(), String> {
    let config = Config::default();
    let generated = payload(&config, TEST_BOOKS)?;
    let input = parse::planner_input(generated.clone())?;
    assert_eq!(input.books.len(), TEST_BOOKS);
    assert!(input.books.iter().any(|book| book.blocked_by.is_some()));
    assert!(input.books.iter().any(|book| book.deadline.is_some()));
    assert!(input
        .books
        .iter()
        .any(|book| book.max_minutes_per_day.is_some()));
    assert_eq!(generated, payload(&config, TEST_BOOKS)?);
    let smaller = payload(&config, PREFIX_BOOKS)?;
    let large_books = generated["books"].as_array().ok_or("missing books")?;
    let small_books = smaller["books"].as_array().ok_or("missing books")?;
    assert!(large_books.starts_with(small_books));
    for book in large_books {
        assert_coherent_book(book)?;
    }
    let other = Config {
        seed: DIFFERENT_SEED,
        ..config
    };
    assert_ne!(smaller, payload(&other, PREFIX_BOOKS)?);
    Ok(())
}

fn assert_coherent_book(book: &Value) -> Result<(), String> {
    let pages = book["pages_total"].as_u64().ok_or("missing pages")?;
    let words = book["words_total"].as_u64().ok_or("missing words")?;
    assert_eq!(words % pages, 0);
    for field in ["title", "author"] {
        let metadata = book[field].as_str().ok_or("missing metadata")?;
        assert!(!metadata.is_empty());
        assert!(metadata.bytes().all(|byte| byte.is_ascii_hexdigit()));
    }
    if let Some(remaining) = book["remaining_words"].as_u64() {
        assert!(remaining > 0 && remaining <= words);
    }
    if let Some(pages_read) = book["pages_read"].as_u64() {
        assert!(pages_read < pages);
    }
    Ok(())
}

#[test]
fn horizon_has_full_daily_capacity_including_leap_days() -> Result<(), String> {
    let config = Config::default();
    assert_eq!(config.years, EXPECTED_DEFAULT_YEARS);
    assert!(config.years <= MAX_YEARS);
    let input = parse::planner_input(payload(&config, PREFIX_BOOKS)?)?;
    let days = calendar::date_range(config.start_date(), config.end_date())?;
    let expected_days = (config.end_date() - config.start_date()).num_days() + 1;
    assert_eq!(days.len() as i64, expected_days);
    for day in days {
        assert_eq!(
            calendar::minutes_for_day(&input.settings, day),
            MINUTES_PER_DAY
        );
        assert_eq!(
            calendar::day_capacity_blocks(&input.settings, day),
            BLOCKS_PER_DAY
        );
    }
    let shorter = Config::parse(&options(&["--years", "1"]))?;
    assert!(shorter.end_date() < config.end_date());
    Ok(())
}

#[test]
fn growth_respects_limit_and_overflow() -> Result<(), String> {
    let config = Config {
        max_books: Some(LIMIT_COUNT),
        ..Config::default()
    };
    assert_eq!(next_count(&config, FAST_COUNT)?, Some(LIMIT_COUNT));
    assert_eq!(next_count(&config, LIMIT_COUNT)?, None);
    assert!(next_count(&Config::default(), usize::MAX).is_err());
    Ok(())
}

#[test]
fn one_second_range_uses_observed_counts_and_strict_time_limit() {
    let mut search = Search::default();
    let fast = Measurement {
        input_books: FAST_COUNT,
        greedy_time: Duration::from_millis(FAST_MILLISECONDS),
        ..Measurement::default()
    };
    let slow = Measurement {
        input_books: SLOW_COUNT,
        greedy_time: ONE_SECOND,
        ..Measurement::default()
    };
    search.record(&fast);
    assert_eq!(search.refinement_count(), None);
    search.record(&slow);
    assert_eq!(search.refinement_count(), Some(MIDDLE_COUNT));
    let near = Measurement {
        input_books: FAST_COUNT + 1,
        ..slow
    };
    search.record(&near);
    assert_eq!(search.refinement_count(), None);
    assert_eq!(
        search.best.as_ref().map(|row| row.input_books),
        Some(FAST_COUNT)
    );
}

#[test]
fn slow_first_run_can_search_smaller_counts() {
    let mut search = Search::default();
    search.record(&Measurement {
        input_books: SLOW_COUNT,
        greedy_time: STOP_TIME,
        ..Measurement::default()
    });
    assert_eq!(search.refinement_count(), Some(FAST_COUNT));
}

#[test]
fn real_plans_report_actual_counts_and_capped_run_finishes() -> Result<(), String> {
    let config = Config {
        start_books: PREFIX_BOOKS,
        max_books: Some(PREFIX_BOOKS),
        samples: 1,
        ..Config::default()
    };
    let row = measure(&config, PREFIX_BOOKS)?;
    assert_eq!(row.input_books, PREFIX_BOOKS);
    assert!(row.assigned_books > 0 && row.assigned_books <= row.input_books);
    assert!(row.finished_books <= row.assigned_books);
    assert!(row.sessions >= row.assigned_books);
    assert!(row.total_time >= row.greedy_time);
    let mut printed = Vec::new();
    super::run(&config, &mut printed)?;
    let text = String::from_utf8(printed).map_err(|error| error.to_string())?;
    assert!(text.contains("Stopped at --max-books 20"));
    assert!(text.contains("Assigned"));
    assert!(text.contains("Whole plan"));
    Ok(())
}

#[test]
fn terminal_numbers_and_time_bars_are_readable() {
    assert_eq!(grouped(0), "0");
    assert_eq!(grouped(TEST_BOOKS), "1,000");
    assert_eq!(time_bar(Duration::ZERO), "[····················]");
    assert_eq!(time_bar(STOP_TIME + ONE_SECOND), "[####################]");
}
