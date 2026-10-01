//! Coherent synthetic book payloads exercising the production input parser.

use chrono::Days;
use serde_json::{json, Value};

use super::config::{Config, BLOCKS_PER_DAY, MINUTES_PER_DAY, QUANTUM_MINUTES, WORDS_PER_MINUTE};
use super::random::Random;
use crate::native_planner::models::WEEKDAYS;

const MIN_PAGES: u64 = 20;
const MAX_PAGES: u64 = 1200;
const MIN_WORDS_PER_PAGE: u64 = 200;
const MAX_WORDS_PER_PAGE: u64 = 500;
const MAX_READ_PERCENT: u64 = 90;
const PERCENT_SCALE: u64 = 100;
const MAX_PRIORITY: u64 = 5;
const MAX_DIFFICULTY: u64 = 10;
const MAX_MINIMUM_BLOCKS: u64 = 4;
const ALL_WEEKDAY_BITS: u64 = (1 << WEEKDAYS.len()) - 1;
const OPTIONAL_FIELD_ODDS: u64 = 5;
const PROGRESS_VARIANTS: usize = 4;

/// Page-based progress used to keep all parser input variants consistent.
struct Progress {
    pages_read: u64,
    words_per_page: u64,
}

/// Starts from the same seed at every count, so larger inputs extend smaller ones.
pub(super) fn payload(config: &Config, count: usize) -> Result<Value, String> {
    let mut books = Vec::new();
    books.try_reserve_exact(count).map_err(|error| {
        format!("Cannot allocate {count} books: {error}. Try --max-books with a smaller count.")
    })?;
    let mut random = Random::new(config.seed);
    for index in 0..count {
        books.push(book(&mut random, config, index));
    }
    Ok(json!({"books": books, "settings": settings(config)}))
}

fn settings(config: &Config) -> Value {
    json!({
        "start_date": config.start_date().to_string(),
        "end_date": config.end_date().to_string(),
        "minutes_per_day": MINUTES_PER_DAY,
        "time_quantum_minutes": QUANTUM_MINUTES,
        "max_blocks_per_book_per_day": BLOCKS_PER_DAY,
        "max_books_per_day": BLOCKS_PER_DAY,
        "max_sessions_per_day": BLOCKS_PER_DAY,
        "wpm_base": WORDS_PER_MINUTE,
        "solver_profile": "fast",
        "plan_mode": "finish_soon",
        "days_off": [],
    })
}

/// Keeps page/word totals and progress consistent while varying scheduling rules.
fn book(random: &mut Random, config: &Config, index: usize) -> Value {
    let pages = random.between(MIN_PAGES, MAX_PAGES);
    let words_per_page = random.between(MIN_WORDS_PER_PAGE, MAX_WORDS_PER_PAGE);
    let pages_read = pages * random.between(0, MAX_READ_PERCENT) / PERCENT_SCALE;
    let mut book = json!({
        "book_id": book_id(index),
        "title": random.string(),
        "author": random.string(),
        "pages_total": pages,
        "words_total": pages * words_per_page,
        "priority": random.between(1, MAX_PRIORITY),
        "difficulty": random.between(1, MAX_DIFFICULTY),
        "min_blocks_per_session": random.between(1, MAX_MINIMUM_BLOCKS),
        "scheduled_days": scheduled_days(random),
        "deadline": deadline(random, config),
        "max_minutes_per_day": daily_limit(random),
        "blocked_by": blocker(random, index),
    });
    set_progress(
        &mut book,
        index,
        Progress {
            pages_read,
            words_per_page,
        },
    );
    book
}

fn book_id(index: usize) -> String {
    format!("random-book-{index}")
}

/// Samples a nonempty weekday mask, so every generated book can be read.
fn scheduled_days(random: &mut Random) -> Vec<&'static str> {
    let mask = random.between(1, ALL_WEEKDAY_BITS);
    WEEKDAYS
        .iter()
        .enumerate()
        .filter(|(index, _)| mask & (1 << index) != 0)
        .map(|(_, day)| *day)
        .collect()
}

/// Mixes undated books with deadlines inside the requested horizon.
fn deadline(random: &mut Random, config: &Config) -> Option<String> {
    if random.between(1, OPTIONAL_FIELD_ODDS) != 1 {
        return None;
    }
    let last_day = (config.end_date() - config.start_date()).num_days() as u64;
    let day = config.start_date() + Days::new(random.between(0, last_day));
    Some(day.to_string())
}

/// Optional daily limits always allow even the largest minimum session.
fn daily_limit(random: &mut Random) -> Option<i64> {
    if random.between(1, OPTIONAL_FIELD_ODDS) != 1 {
        return None;
    }
    let blocks = random.between(MAX_MINIMUM_BLOCKS, BLOCKS_PER_DAY as u64) as i64;
    Some(blocks * QUANTUM_MINUTES)
}

/// Samples earlier book IDs to exercise dependencies without creating cycles.
fn blocker(random: &mut Random, index: usize) -> Option<String> {
    let has_blocker = random.between(1, OPTIONAL_FIELD_ODDS) == 1;
    if index == 0 || !has_blocker {
        return None;
    }
    // Earlier references guarantee unique existing blockers without cycles.
    let earlier = random.between(0, index as u64 - 1) as usize;
    Some(book_id(earlier))
}

/// Rotates through all supported ways of specifying reading progress.
fn set_progress(book: &mut Value, index: usize, progress: Progress) {
    let words_read = progress.pages_read * progress.words_per_page;
    match index % PROGRESS_VARIANTS {
        0 => book["words_read"] = json!(words_read),
        1 => book["pages_read"] = json!(progress.pages_read),
        2 => {
            let total = book["words_total"].as_u64().expect("generated word count");
            book["progress_percent"] =
                json!(words_read as f64 * PERCENT_SCALE as f64 / total as f64);
        }
        _ => {
            let total = book["words_total"].as_u64().expect("generated word count");
            book["remaining_words"] = json!(total - words_read);
        }
    }
}
