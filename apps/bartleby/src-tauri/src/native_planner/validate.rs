use std::collections::{BTreeSet, HashMap, HashSet};

use crate::native_planner::models::{
    Book, Settings, PLAN_MODE_FINISH_SOON, PLAN_MODE_SPREAD_OUT, WEEKDAYS,
};

const MAX_PROGRESS_PERCENT: f64 = 100.0;
const MIN_PROGRESS_PERCENT: f64 = 0.0;

pub fn validate_blockers(books: &[Book]) -> Result<(), String> {
    let by_id: HashMap<&str, &Book> = books
        .iter()
        .map(|book| (book.book_id.as_str(), book))
        .collect();
    for book in books {
        if let Some(blocked_by) = &book.blocked_by {
            if !by_id.contains_key(blocked_by.as_str()) {
                return Err(format!(
                    "book {} is blocked by missing book_id {}",
                    book.book_id, blocked_by
                ));
            }
        }
    }
    let mut visiting = HashSet::new();
    let mut visited = HashSet::new();
    for book in books {
        walk_blockers(book.book_id.as_str(), &by_id, &mut visiting, &mut visited)?;
    }
    Ok(())
}

pub fn validate_book(book: &Book) -> Result<(), String> {
    if book.book_id.is_empty() || book.title.is_empty() {
        return Err(format!(
            "book_id and title are required for {}",
            book.book_id
        ));
    }
    if book.remaining_words <= 0 {
        return Err(format!(
            "There are no words left to schedule for {}",
            book.book_id
        ));
    }
    if !(1..=5).contains(&book.priority) {
        return Err(format!(
            "priority must be between 1 and 5 for {}",
            book.book_id
        ));
    }
    if !(1..=10).contains(&book.difficulty) {
        return Err(format!("difficulty must be 1..10 for {}", book.book_id));
    }
    if book.min_blocks_per_session <= 0 {
        return Err(format!(
            "min_blocks_per_session must be > 0 for {}",
            book.book_id
        ));
    }
    if let Some(words_total) = book.words_total {
        if words_total < book.remaining_words {
            return Err(format!(
                "words_total cannot be less than remaining_words for {}",
                book.book_id
            ));
        }
    }
    if !(MIN_PROGRESS_PERCENT..=MAX_PROGRESS_PERCENT).contains(&book.progress_percent) {
        return Err(format!(
            "progress_percent must be between 0 and 100 for {}",
            book.book_id
        ));
    }
    if let Some(max_minutes_per_day) = book.max_minutes_per_day {
        if max_minutes_per_day <= 0 {
            return Err(format!(
                "max_minutes_per_day must be > 0 for {}",
                book.book_id
            ));
        }
    }
    if book.blocked_by.as_deref() == Some(book.book_id.as_str()) {
        return Err(format!("book {} cannot block itself", book.book_id));
    }
    validate_scheduled_days(&book.scheduled_days, &book.book_id)
}

pub fn validate_settings(settings: &Settings) -> Result<(), String> {
    if settings.start_date > settings.end_date {
        return Err("end_date must be on or after start_date".to_string());
    }
    if settings.minutes_per_day.unwrap_or(0) <= 0 && settings.minutes_by_weekday.is_empty() {
        return Err("Set minutes_per_day or minutes_by_weekday in settings".to_string());
    }
    if settings.time_quantum_minutes <= 0 {
        return Err(
            "time_quantum_minutes must be set to a positive integer in settings".to_string(),
        );
    }
    if settings.max_sessions_per_day <= 0 || settings.max_books_per_day <= 0 {
        return Err(
            "Set max_sessions_per_day and max_books_per_day to positive integers".to_string(),
        );
    }
    let weekday_keys: BTreeSet<&str> = settings
        .minutes_by_weekday
        .keys()
        .map(String::as_str)
        .collect();
    let valid_weekdays: BTreeSet<&str> = WEEKDAYS.into_iter().collect();
    if !weekday_keys.is_empty() && weekday_keys != valid_weekdays {
        return Err("minutes_by_weekday keys must be Mon..Sun when provided".to_string());
    }
    let difficulty_keys: BTreeSet<i64> = settings.difficulty_multiplier.keys().copied().collect();
    let valid_difficulty_keys: BTreeSet<i64> = (1..=10).collect();
    if !difficulty_keys.is_empty() && difficulty_keys != valid_difficulty_keys {
        return Err("difficulty_multiplier must be empty or contain keys 1..10".to_string());
    }
    if settings.plan_mode != PLAN_MODE_FINISH_SOON && settings.plan_mode != PLAN_MODE_SPREAD_OUT {
        return Err(format!(
            "plan_mode must be set to one of: {PLAN_MODE_FINISH_SOON}, {PLAN_MODE_SPREAD_OUT}"
        ));
    }
    Ok(())
}

fn validate_scheduled_days(days: &BTreeSet<String>, book_id: &str) -> Result<(), String> {
    if days.is_empty() {
        return Err(format!("scheduled_days is required for {book_id}"));
    }
    let invalid_days = days
        .iter()
        .filter(|day| !WEEKDAYS.contains(&day.as_str()))
        .cloned()
        .collect::<Vec<_>>();
    if !invalid_days.is_empty() {
        return Err(format!("scheduled_days must be Mon..Sun for {book_id}"));
    }
    Ok(())
}

fn walk_blockers<'a>(
    book_id: &'a str,
    by_id: &HashMap<&'a str, &'a Book>,
    visiting: &mut HashSet<&'a str>,
    visited: &mut HashSet<&'a str>,
) -> Result<(), String> {
    if visited.contains(book_id) {
        return Ok(());
    }
    if !visiting.insert(book_id) {
        return Err("blockers contain a cycle; remove circular dependencies".to_string());
    }
    if let Some(blocker) = &by_id[book_id].blocked_by {
        walk_blockers(blocker.as_str(), by_id, visiting, visited)?;
    }
    visiting.remove(book_id);
    visited.insert(book_id);
    Ok(())
}
