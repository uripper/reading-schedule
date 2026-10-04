use serde_json::{json, Value};

pub const HIGHEST_PRIORITY: i64 = 1;
pub const LOWEST_PRIORITY: i64 = 5;
pub const MINUTES_FOR_ONE_BLOCK: i64 = 5;
pub const MINUTES_PER_SINGLE_BLOCK_DAY: i64 = 5;
pub const MONDAY_DATE: &str = "2026-05-18";
pub const TUESDAY_DATE: &str = "2026-05-19";
pub const WORDS_FOR_ONE_BLOCK: i64 = 500;
pub const WORDS_TOTAL: i64 = 1000;

const MAX_BLOCKS_PER_BOOK_PER_DAY: i64 = 100;
const MAX_BOOKS_PER_DAY: i64 = 1;
const MAX_SESSIONS_PER_DAY: i64 = 1;
const WPM_BASE: i64 = 100;

pub fn planner_settings(start_date: &str, end_date: &str, minutes_per_day: i64) -> Value {
    json!({
        "end_date": end_date,
        "max_blocks_per_book_per_day": MAX_BLOCKS_PER_BOOK_PER_DAY,
        "max_books_per_day": MAX_BOOKS_PER_DAY,
        "max_sessions_per_day": MAX_SESSIONS_PER_DAY,
        "minutes_per_day": minutes_per_day,
        "start_date": start_date,
        "time_quantum_minutes": MINUTES_FOR_ONE_BLOCK,
        "wpm_base": WPM_BASE,
    })
}

pub fn book(book_id: &str, title: &str, priority: i64, remaining_words: i64) -> Value {
    json!({
        "book_id": book_id,
        "min_blocks_per_session": 1,
        "priority": priority,
        "remaining_words": remaining_words,
        "scheduled_days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        "title": title,
        "words_total": WORDS_TOTAL,
    })
}
