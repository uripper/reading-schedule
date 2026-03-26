use std::collections::{BTreeSet, HashMap, HashSet};

use serde_json::{Map, Value};
use uuid::Uuid;

use crate::native_planner::calendar::{parse_date, today_local};
use crate::native_planner::coerce::{
    as_array, as_object, optional_i64_field, optional_string_field, parse_f64_value,
    parse_i64_value, required_string_field, string_list_or_csv_field,
};
use crate::native_planner::models::{
    default_difficulty_multiplier, default_scheduled_days, Book, DifficultyMultiplier,
    MinutesByWeekday, PlannerInput, Settings, SolverProfile, DEFAULT_DIFFICULTY,
    DEFAULT_MIN_BLOCKS_PER_SESSION, DEFAULT_PRIORITY, DEFAULT_SOLVER_PROFILE,
    PLAN_MODE_FINISH_SOON, PLAN_MODE_SPREAD_OUT,
};
use crate::native_planner::validate::{validate_blockers, validate_book, validate_settings};
use crate::native_planner::word_stats::word_stats_from_data;

const DEFAULT_MAX_BLOCKS_PER_BOOK_PER_DAY: i64 = 12;
const DEFAULT_MAX_BOOKS_PER_DAY: i64 = 2;
const DEFAULT_MAX_SESSIONS_PER_DAY: i64 = 2;
const DEFAULT_TIME_QUANTUM_MINUTES: i64 = 15;
const DEFAULT_W_FINISH: f64 = 5.0;
const DEFAULT_W_PRIORITY: f64 = 5.0;
const DEFAULT_W_SMOOTH: f64 = 0.0;
const DEFAULT_W_SWITCH: f64 = 0.0;

pub fn planner_input(payload: Value) -> Result<PlannerInput, String> {
    let payload = as_object(&payload, "payload")?;
    let books_raw = payload
        .get("books")
        .ok_or_else(|| "payload requires books[] and settings object".to_string())?;
    let settings_raw = payload
        .get("settings")
        .ok_or_else(|| "payload requires books[] and settings object".to_string())?;
    let books = parse_books(as_array(books_raw, "books")?)?;
    let settings = parse_settings(as_object(settings_raw, "settings")?)?;
    validate_blockers(&books)?;
    Ok(PlannerInput { books, settings })
}

fn parse_books(books_raw: &[Value]) -> Result<Vec<Book>, String> {
    let mut books = Vec::new();
    for (index, row) in books_raw.iter().enumerate() {
        let data = as_object(row, &format!("book at index {index}"))?;
        books.push(parse_book(data)?);
    }
    Ok(books)
}

fn parse_book(data: &Map<String, Value>) -> Result<Book, String> {
    let word_stats = word_stats_from_data(data)?;
    let book = Book {
        blocked_by: blocked_by(data)?,
        book_id: book_id(data),
        deadline: deadline(data)?,
        difficulty: int_with_default(data, "difficulty", DEFAULT_DIFFICULTY)?,
        max_minutes_per_day: optional_i64_field(data, "max_minutes_per_day")?,
        min_blocks_per_session: int_with_default(
            data,
            "min_blocks_per_session",
            DEFAULT_MIN_BLOCKS_PER_SESSION,
        )?,
        priority: int_with_default(data, "priority", DEFAULT_PRIORITY)?,
        progress_percent: word_stats.progress_percent,
        remaining_words: word_stats.remaining_words,
        scheduled_days: scheduled_days(data)?,
        title: required_string_field(data, "title")?,
        words_total: Some(word_stats.words_total),
    };
    validate_book(&book)?;
    Ok(book)
}

fn parse_settings(data: &Map<String, Value>) -> Result<Settings, String> {
    let minutes_by_weekday = minutes_by_weekday(data)?;
    let minutes_per_day = minutes_per_day(data, &minutes_by_weekday)?;
    let settings = Settings {
        days_off: days_off(data)?,
        difficulty_multiplier: difficulty_multiplier(data)?,
        end_date: parse_date(&required_string_field(data, "end_date")?)?,
        max_blocks_per_book_per_day: int_with_default(
            data,
            "max_blocks_per_book_per_day",
            DEFAULT_MAX_BLOCKS_PER_BOOK_PER_DAY,
        )?,
        max_books_per_day: int_with_default(data, "max_books_per_day", DEFAULT_MAX_BOOKS_PER_DAY)?,
        max_sessions_per_day: int_with_default(
            data,
            "max_sessions_per_day",
            DEFAULT_MAX_SESSIONS_PER_DAY,
        )?,
        minutes_by_weekday,
        minutes_per_day: Some(minutes_per_day),
        plan_mode: plan_mode(data),
        solver_profile: solver_profile(data),
        start_date: start_date(data)?,
        time_quantum_minutes: int_with_default(
            data,
            "time_quantum_minutes",
            DEFAULT_TIME_QUANTUM_MINUTES,
        )?,
        w_finish: float_with_default(data, "w_finish", DEFAULT_W_FINISH)?,
        w_priority: float_with_default(data, "w_priority", DEFAULT_W_PRIORITY)?,
        w_smooth: float_with_default(data, "w_smooth", DEFAULT_W_SMOOTH)?,
        w_switch: float_with_default(data, "w_switch", DEFAULT_W_SWITCH)?,
        wpm_base: required_int_field(data, "wpm_base")?,
    };
    validate_settings(&settings)?;
    Ok(settings)
}

fn blocked_by(data: &Map<String, Value>) -> Result<Option<String>, String> {
    let blocked_by = optional_string_field(data, "blocked_by")?;
    if blocked_by.is_some() {
        return Ok(blocked_by);
    }
    optional_string_field(data, "blocker_book_id")
}

fn book_id(data: &Map<String, Value>) -> String {
    match optional_string_field(data, "book_id") {
        Ok(Some(book_id)) => book_id,
        Ok(None) | Err(_) => Uuid::new_v4().to_string(),
    }
}

fn days_off(data: &Map<String, Value>) -> Result<HashSet<chrono::NaiveDate>, String> {
    let Some(raw_days_off) = data.get("days_off") else {
        return Ok(HashSet::new());
    };
    if raw_days_off.is_null() {
        return Ok(HashSet::new());
    }
    let days = as_array(raw_days_off, "days_off")?;
    let mut parsed = HashSet::new();
    for day in days {
        let text = day
            .as_str()
            .ok_or_else(|| "days_off must contain ISO date strings".to_string())?;
        parsed.insert(parse_date(text.trim())?);
    }
    Ok(parsed)
}

fn deadline(data: &Map<String, Value>) -> Result<Option<chrono::NaiveDate>, String> {
    let Some(deadline) = optional_string_field(data, "deadline")? else {
        return Ok(None);
    };
    Ok(Some(parse_date(&deadline)?))
}

fn difficulty_multiplier(data: &Map<String, Value>) -> Result<DifficultyMultiplier, String> {
    let Some(raw_multiplier) = data.get("difficulty_multiplier") else {
        return Ok(default_difficulty_multiplier());
    };
    if raw_multiplier.is_null() {
        return Ok(default_difficulty_multiplier());
    }
    let multiplier = as_object(raw_multiplier, "difficulty_multiplier")?;
    let mut parsed = HashMap::new();
    for (key, value) in multiplier {
        let difficulty = key
            .trim()
            .parse::<i64>()
            .map_err(|_| format!("invalid integer for difficulty_multiplier key: {key}"))?;
        parsed.insert(difficulty, parse_f64_value(value, "difficulty_multiplier")?);
    }
    Ok(parsed)
}

fn float_with_default(data: &Map<String, Value>, field: &str, default: f64) -> Result<f64, String> {
    match data.get(field) {
        Some(value) if !value.is_null() => parse_f64_value(value, field),
        _ => Ok(default),
    }
}

fn int_with_default(data: &Map<String, Value>, field: &str, default: i64) -> Result<i64, String> {
    match data.get(field) {
        Some(value) if !value.is_null() => parse_i64_value(value, field),
        _ => Ok(default),
    }
}

fn minutes_by_weekday(data: &Map<String, Value>) -> Result<MinutesByWeekday, String> {
    let Some(raw_minutes_by_weekday) = data.get("minutes_by_weekday") else {
        return Ok(HashMap::new());
    };
    if raw_minutes_by_weekday.is_null() {
        return Ok(HashMap::new());
    }
    let minutes_by_weekday = as_object(raw_minutes_by_weekday, "minutes_by_weekday")?;
    let mut parsed = HashMap::new();
    for (key, value) in minutes_by_weekday {
        parsed.insert(
            normalized_weekday_key(key),
            parse_i64_value(value, "minutes_by_weekday")?,
        );
    }
    Ok(parsed)
}

fn minutes_per_day(
    data: &Map<String, Value>,
    minutes_by_weekday: &MinutesByWeekday,
) -> Result<i64, String> {
    let Some(raw_minutes_per_day) = data.get("minutes_per_day") else {
        return Ok(default_minutes_per_day(minutes_by_weekday));
    };
    if raw_minutes_per_day.is_null() {
        return Ok(default_minutes_per_day(minutes_by_weekday));
    }
    if raw_minutes_per_day
        .as_str()
        .is_some_and(|value| value.trim().is_empty())
    {
        return Err("minutes_per_day cannot be empty. Provide a number.".to_string());
    }
    parse_i64_value(raw_minutes_per_day, "minutes_per_day")
}

fn plan_mode(data: &Map<String, Value>) -> String {
    let raw_mode = optional_string_field(data, "plan_mode")
        .ok()
        .flatten()
        .unwrap_or_else(|| PLAN_MODE_FINISH_SOON.to_string())
        .to_lowercase();
    if raw_mode == PLAN_MODE_SPREAD_OUT {
        return raw_mode;
    }
    PLAN_MODE_FINISH_SOON.to_string()
}

fn normalized_weekday_key(key: &str) -> String {
    let normalized = key.chars().take(3).collect::<String>();
    if normalized.is_empty() {
        return key.to_string();
    }
    normalized[..1].to_uppercase() + &normalized[1..].to_lowercase()
}

fn solver_profile(data: &Map<String, Value>) -> SolverProfile {
    let raw_profile = optional_string_field(data, "planner_solver_profile")
        .ok()
        .flatten()
        .map(|value| value.to_lowercase());
    match raw_profile.as_deref() {
        Some("fast") | Some("thorough") | Some("balanced") => SolverProfile::Fast,
        _ => DEFAULT_SOLVER_PROFILE,
    }
}

fn required_int_field(data: &Map<String, Value>, field: &str) -> Result<i64, String> {
    let value = data
        .get(field)
        .ok_or_else(|| format!("{field} is required"))?;
    parse_i64_value(value, field)
}

fn scheduled_days(data: &Map<String, Value>) -> Result<BTreeSet<String>, String> {
    let Some(entries) = string_list_or_csv_field(data, "scheduled_days")? else {
        return Ok(default_scheduled_days());
    };
    let selected = entries
        .into_iter()
        .filter(|entry| !entry.is_empty())
        .collect::<BTreeSet<_>>();
    if selected.is_empty() {
        return Err("scheduled_days must include at least one day".to_string());
    }
    Ok(selected)
}

fn start_date(data: &Map<String, Value>) -> Result<chrono::NaiveDate, String> {
    let Some(start_date) = optional_string_field(data, "start_date")? else {
        return Ok(today_local());
    };
    parse_date(&start_date)
}

fn default_minutes_per_day(minutes_by_weekday: &HashMap<String, i64>) -> i64 {
    if minutes_by_weekday.is_empty() {
        return 0;
    }
    minutes_by_weekday.values().sum::<i64>() / minutes_by_weekday.len() as i64
}
