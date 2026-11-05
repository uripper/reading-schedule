//! Parses the per-day and per-book constraints a replan uses to plan around
//! sessions the user already owns.
//!
//! - `reserved_*_by_date` take minutes, session slots, and book slots out of
//!   a day and keep the reserved books off that day.
//! - `excluded_book_ids_by_date` keeps books off a day without using a slot.
//! - `reserved_words_by_book_id` removes words already claimed by kept
//!   sessions from each book's remaining work.

use std::collections::{HashMap, HashSet};

use serde_json::{Map, Value};

use crate::native_planner::calendar::parse_date;
use crate::native_planner::coerce::{as_array, as_object, parse_i64_value};
use crate::native_planner::models::{
    Book, ReservedBookIdsByDate, ReservedCountsByDate, ReservedWordsByBookId, Settings,
};

const EXCLUDED_BOOK_IDS_FIELD: &str = "excluded_book_ids_by_date";
const RESERVED_BOOK_IDS_FIELD: &str = "reserved_book_ids_by_date";
const RESERVED_WORDS_FIELD: &str = "reserved_words_by_book_id";

pub fn reserved_book_ids_by_date(
    data: &Map<String, Value>,
) -> Result<ReservedBookIdsByDate, String> {
    book_ids_by_date(data, RESERVED_BOOK_IDS_FIELD)
}

pub fn excluded_book_ids_by_date(
    data: &Map<String, Value>,
) -> Result<ReservedBookIdsByDate, String> {
    book_ids_by_date(data, EXCLUDED_BOOK_IDS_FIELD)
}

pub fn reserved_minutes_by_date(data: &Map<String, Value>) -> Result<ReservedCountsByDate, String> {
    reserved_counts_by_date(data, "reserved_minutes_by_date")
}

pub fn reserved_sessions_by_date(
    data: &Map<String, Value>,
) -> Result<ReservedCountsByDate, String> {
    reserved_counts_by_date(data, "reserved_sessions_by_date")
}

pub fn reserved_words_by_book_id(
    data: &Map<String, Value>,
) -> Result<ReservedWordsByBookId, String> {
    let Some(entries) = optional_object(data, RESERVED_WORDS_FIELD)? else {
        return Ok(HashMap::new());
    };
    let mut parsed = HashMap::new();
    for (book_id, value) in entries {
        parsed.insert(
            book_id.clone(),
            nonnegative_count(value, RESERVED_WORDS_FIELD)?,
        );
    }
    Ok(parsed)
}

/// Removes reserved words from each book's remaining work, never below zero.
pub fn apply_reserved_words(books: &mut [Book], settings: &Settings) {
    for book in books {
        let Some(reserved) = settings.reserved_words_by_book_id.get(&book.book_id) else {
            continue;
        };
        book.remaining_words = (book.remaining_words - reserved).max(0);
    }
}

fn optional_object<'a>(
    data: &'a Map<String, Value>,
    field: &str,
) -> Result<Option<&'a Map<String, Value>>, String> {
    match data.get(field) {
        None | Some(Value::Null) => Ok(None),
        Some(raw) => as_object(raw, field).map(Some),
    }
}

fn book_ids_by_date(
    data: &Map<String, Value>,
    field: &str,
) -> Result<ReservedBookIdsByDate, String> {
    let Some(entries) = optional_object(data, field)? else {
        return Ok(HashMap::new());
    };
    let mut parsed = HashMap::new();
    for (date, value) in entries {
        parsed.insert(parse_date(date)?, string_set(value, field, date)?);
    }
    Ok(parsed)
}

fn reserved_counts_by_date(
    data: &Map<String, Value>,
    field: &str,
) -> Result<ReservedCountsByDate, String> {
    let Some(entries) = optional_object(data, field)? else {
        return Ok(HashMap::new());
    };
    let mut parsed = HashMap::new();
    for (date, value) in entries {
        let count = nonnegative_count(value, field)?;
        parsed.insert(parse_date(date)?, count);
    }
    Ok(parsed)
}

fn string_set(value: &Value, field: &str, date: &str) -> Result<HashSet<String>, String> {
    let items = as_array(value, field)?;
    let parsed = items
        .iter()
        .map(|item| book_id_string(item, field, date))
        .collect::<Result<Vec<_>, _>>()?;
    Ok(parsed
        .into_iter()
        .filter(|book_id| !book_id.is_empty())
        .collect())
}

fn nonnegative_count(value: &Value, field: &str) -> Result<i64, String> {
    let count = parse_i64_value(value, field)?;
    if count >= 0 {
        return Ok(count);
    }
    Err(format!("{field} values must be non-negative"))
}

fn book_id_string(value: &Value, field: &str, date: &str) -> Result<String, String> {
    value
        .as_str()
        .map(str::trim)
        .map(str::to_string)
        .ok_or_else(|| format!("{field}[{date}] must contain strings"))
}
