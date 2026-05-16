use std::collections::HashMap;

use chrono::NaiveDate;

use crate::native_planner::calendar::book_is_scheduled_for_day;
use crate::native_planner::models::{priority_order, Book};
use crate::native_planner::solve::DayState;

const MIN_START_BLOCKS: i64 = 1;

pub fn active_book(state: &DayState<'_>) -> Option<String> {
    let mut active = state
        .used
        .iter()
        .filter(|book_id| is_active_book(state, book_id))
        .cloned()
        .collect::<Vec<_>>();
    active.sort_by(|left, right| {
        let left_book = &state.books[left];
        let right_book = &state.books[right];
        priority_order(left_book.priority, right_book.priority)
            .then_with(|| left_book.difficulty.cmp(&right_book.difficulty))
            .then_with(|| left.cmp(right))
    });
    active.into_iter().next()
}

pub fn assign_blocks(state: &mut DayState<'_>, book_id: &str, blocks: i64) {
    let key = (book_id.to_string(), state.day);
    *state.assignments.entry(key).or_insert(0) += blocks;
    *state.remaining.entry(book_id.to_string()).or_insert(0.0) =
        (*state.remaining.get(book_id).unwrap_or(&0.0)
            - blocks as f64 * *state.wpb.get(book_id).unwrap_or(&0) as f64)
            .max(0.0);
    state.cap -= blocks;
}

pub fn books_by_id(books: &[Book]) -> HashMap<String, Book> {
    books
        .iter()
        .cloned()
        .map(|book| (book.book_id.clone(), book))
        .collect()
}

pub fn can_start_book(state: &DayState<'_>, book_id: &str) -> bool {
    let start_blocks = start_blocks_for_book(state, book_id);
    !state.used.contains(&book_id.to_string())
        && *state.remaining.get(book_id).unwrap_or(&0.0) > 0.0
        && is_unlocked(&state.books[book_id], state.remaining)
        && book_is_scheduled_for_day(&state.books[book_id], state.day)
        && state.cap >= start_blocks
        && room(state, book_id) >= start_blocks
}

pub fn day_book_limit_reached(state: &DayState<'_>) -> bool {
    state.used.len() as i64 >= state.daily_book_cap
}

pub fn deadline_sort_key(deadline: Option<NaiveDate>) -> NaiveDate {
    deadline
        .unwrap_or_else(|| NaiveDate::from_ymd_opt(9999, 12, 31).expect("valid far future date"))
}

fn is_active_book(state: &DayState<'_>, book_id: &str) -> bool {
    *state.remaining.get(book_id).unwrap_or(&0.0) > 0.0
        && is_unlocked(&state.books[book_id], state.remaining)
        && book_is_scheduled_for_day(&state.books[book_id], state.day)
        && room(state, book_id) > 0
}

pub fn is_unlocked(book: &Book, remaining: &HashMap<String, f64>) -> bool {
    match &book.blocked_by {
        Some(blocker) => remaining.get(blocker).copied().unwrap_or(0.0) <= 0.0,
        None => true,
    }
}

pub fn next_book(ordered: &[String], state: &DayState<'_>) -> Option<String> {
    if day_book_limit_reached(state) {
        return None;
    }
    ordered
        .iter()
        .find(|book_id| can_start_book(state, book_id))
        .cloned()
}

/// Returns the block count needed to start or finish a book on a day.
pub fn start_blocks_for_book(state: &DayState<'_>, book_id: &str) -> i64 {
    let min_blocks = state.books[book_id].min_blocks_per_session;
    let remaining_blocks = remaining_blocks_for_book(state, book_id);
    if remaining_blocks <= 0 {
        return min_blocks;
    }
    min_blocks.min(remaining_blocks).max(MIN_START_BLOCKS)
}

fn remaining_blocks_for_book(state: &DayState<'_>, book_id: &str) -> i64 {
    let words_per_block = *state.wpb.get(book_id).unwrap_or(&0);
    if words_per_block <= 0 {
        return 0;
    }
    let words_left = *state.remaining.get(book_id).unwrap_or(&0.0);
    if words_left <= 0.0 {
        return 0;
    }
    (words_left / words_per_block as f64).ceil() as i64
}

fn room(state: &DayState<'_>, book_id: &str) -> i64 {
    let assigned = state
        .assignments
        .get(&(book_id.to_string(), state.day))
        .copied()
        .unwrap_or(0);
    state.limits.get(book_id).copied().unwrap_or(0) - assigned
}
