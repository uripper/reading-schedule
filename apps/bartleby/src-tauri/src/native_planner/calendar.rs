use chrono::{Datelike, Local, NaiveDate};

use crate::native_planner::models::{Book, CalendarMinutes, Settings, WEEKDAYS};

pub fn date_range(start: NaiveDate, end: NaiveDate) -> Result<Vec<NaiveDate>, String> {
    if end < start {
        return Err("end_date must be on or after start_date".to_string());
    }
    let mut days = Vec::new();
    let mut current = start;
    days.push(current);
    while current < end {
        current = current
            .succ_opt()
            .ok_or_else(|| "Unable to advance calendar day range.".to_string())?;
        days.push(current);
    }
    Ok(days)
}

pub fn parse_date(value: &str) -> Result<NaiveDate, String> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d")
        .map_err(|error| format!("invalid date `{value}`: {error}"))
}

pub fn today_local() -> NaiveDate {
    Local::now().date_naive()
}

pub fn weekday_key(day: NaiveDate) -> &'static str {
    WEEKDAYS[day.weekday().num_days_from_monday() as usize]
}

pub fn minutes_for_day(settings: &Settings, day: NaiveDate) -> i64 {
    if settings.days_off.contains(&day) {
        return 0;
    }
    if let Some(minutes) = settings.minutes_by_weekday.get(weekday_key(day)) {
        return *minutes;
    }
    settings.minutes_per_day.unwrap_or(0)
}

pub fn calendar_minutes(settings: &Settings) -> Result<CalendarMinutes, String> {
    let days = date_range(settings.start_date, settings.end_date)?;
    Ok(days
        .into_iter()
        .map(|day| (day, minutes_for_day(settings, day)))
        .collect())
}

pub fn day_capacity_blocks(settings: &Settings, day: NaiveDate) -> i64 {
    minutes_for_day(settings, day) / settings.time_quantum_minutes
}

pub fn book_day_block_limit(book: &Book, settings: &Settings) -> i64 {
    let mut limit = settings.max_blocks_per_book_per_day;
    if let Some(max_minutes_per_day) = book.max_minutes_per_day {
        limit = limit.min(max_minutes_per_day / settings.time_quantum_minutes);
    }
    limit.max(0)
}

pub fn book_is_scheduled_for_day(book: &Book, day: NaiveDate) -> bool {
    book.scheduled_days.contains(weekday_key(day))
}

pub fn words_per_minute(book: &Book, settings: &Settings) -> f64 {
    let multiplier = settings
        .difficulty_multiplier
        .get(&book.difficulty)
        .copied()
        .unwrap_or(1.0);
    settings.wpm_base as f64 * multiplier
}

pub fn words_per_block(book: &Book, settings: &Settings) -> i64 {
    (words_per_minute(book, settings) * settings.time_quantum_minutes as f64).round() as i64
}

pub fn required_minutes(book: &Book, settings: &Settings) -> i64 {
    let words_per_minute = words_per_minute(book, settings);
    if words_per_minute <= 0.0 {
        return 0;
    }
    (book.remaining_words as f64 / words_per_minute).ceil() as i64
}

pub fn required_total_minutes(books: &[Book], settings: &Settings) -> i64 {
    books
        .iter()
        .map(|book| required_minutes(book, settings))
        .sum()
}
