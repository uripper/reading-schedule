use std::cmp::Ordering;
use std::collections::HashMap;

use chrono::{Datelike, NaiveDate};

use crate::native_planner::calendar::{book_day_block_limit, words_per_block};
use crate::native_planner::models::{priority_order, Book, Settings};
use crate::native_planner::solve::DayState;

const MIN_START_BLOCKS: i64 = 1;
const MAX_PROGRESS_PERCENT: f64 = 100.0;
const MIN_PROGRESS_PERCENT: f64 = 0.0;

pub struct GreedyBookState<'a> {
    pub assigned_today: i64,
    pub blocker_index: Option<usize>,
    pub book: &'a Book,
    pub day_limit: i64,
    pub remaining: f64,
    pub used_today: bool,
    pub weekday_mask: u8,
    pub words_per_block: i64,
}

pub fn active_book(state: &DayState<'_, '_>) -> Option<usize> {
    state
        .used
        .iter()
        .copied()
        .filter(|book_index| is_active_book(state, *book_index))
        .min_by(|left, right| compare_active_books(state, left, right))
}

pub fn active_book_chunk(state: &DayState<'_, '_>, book_index: usize) -> i64 {
    let remaining_blocks = remaining_blocks_for_book(state, book_index);
    let book_room = room(state, book_index);
    if remaining_blocks <= 0 {
        return state.cap.min(book_room);
    }
    state.cap.min(book_room).min(remaining_blocks)
}

pub fn assign_blocks(state: &mut DayState<'_, '_>, book_index: usize, blocks: i64) {
    let state_book = &mut state.books[book_index];
    let was_unfinished = state_book.remaining > 0.0;
    let book_id = state_book.book.book_id.clone();
    let key = (book_id, state.day);
    *state.assignments.entry(key).or_insert(0) += blocks;
    state_book.remaining =
        (state_book.remaining - blocks as f64 * state_book.words_per_block as f64).max(0.0);
    state_book.assigned_today += blocks;
    if was_unfinished && state_book.remaining <= 0.0 {
        *state.unfinished_count = state.unfinished_count.saturating_sub(1);
    }
    state.cap -= blocks;
}

pub fn indexed_books<'a>(books: &'a [Book], settings: &Settings) -> Vec<GreedyBookState<'a>> {
    let book_indexes = book_indexes_by_id(books);
    books
        .iter()
        .map(|book| GreedyBookState {
            assigned_today: 0,
            blocker_index: blocker_index(book, &book_indexes),
            book,
            day_limit: book_day_block_limit(book, settings),
            remaining: book.remaining_words as f64,
            used_today: false,
            weekday_mask: weekday_mask(book),
            words_per_block: words_per_block(book, settings),
        })
        .collect()
}

fn book_indexes_by_id(books: &[Book]) -> HashMap<&str, usize> {
    books
        .iter()
        .enumerate()
        .map(|(index, book)| (book.book_id.as_str(), index))
        .collect()
}

fn blocker_index(book: &Book, book_indexes: &HashMap<&str, usize>) -> Option<usize> {
    book.blocked_by
        .as_deref()
        .and_then(|book_id| book_indexes.get(book_id).copied())
}

pub fn can_start_book(state: &DayState<'_, '_>, book_index: usize) -> bool {
    let start_blocks = start_blocks_for_book(state, book_index);
    !book_already_used(state, book_index)
        && state.books[book_index].remaining > 0.0
        && is_unlocked(state, book_index)
        && book_is_scheduled_for_day(state, book_index)
        && state.cap >= start_blocks
        && room(state, book_index) >= start_blocks
}

pub fn day_book_limit_reached(state: &DayState<'_, '_>) -> bool {
    state.used.len() as i64 >= state.daily_book_cap
}

pub fn deadline_sort_key(deadline: Option<NaiveDate>) -> NaiveDate {
    deadline
        .unwrap_or_else(|| NaiveDate::from_ymd_opt(9999, 12, 31).expect("valid far future date"))
}

pub fn day_weekday_bit(day: NaiveDate) -> u8 {
    1_u8 << day.weekday().num_days_from_monday()
}

fn is_active_book(state: &DayState<'_, '_>, book_index: usize) -> bool {
    state.books[book_index].remaining > 0.0
        && is_unlocked(state, book_index)
        && book_is_scheduled_for_day(state, book_index)
        && room(state, book_index) > 0
}

fn book_already_used(state: &DayState<'_, '_>, book_index: usize) -> bool {
    state.books[book_index].used_today
        || state
            .reserved_book_ids
            .contains(&state.books[book_index].book.book_id)
}

fn book_is_scheduled_for_day(state: &DayState<'_, '_>, book_index: usize) -> bool {
    state.books[book_index].weekday_mask & state.weekday_bit != 0
}

fn compare_active_books(state: &DayState<'_, '_>, left: &usize, right: &usize) -> Ordering {
    let left_book = state.books[*left].book;
    let right_book = state.books[*right].book;
    let progress_comparison = progress_order(
        (left_book, state.books[*left].remaining),
        (right_book, state.books[*right].remaining),
    );
    priority_order(left_book.priority, right_book.priority)
        .then(progress_comparison)
        .then_with(|| left_book.difficulty.cmp(&right_book.difficulty))
        .then_with(|| left_book.book_id.cmp(&right_book.book_id))
}

pub fn is_unlocked(state: &DayState<'_, '_>, book_index: usize) -> bool {
    match state.books[book_index].blocker_index {
        Some(blocker_index) => state.books[blocker_index].remaining <= 0.0,
        None => true,
    }
}

pub fn next_book(ordered: &[usize], state: &DayState<'_, '_>) -> Option<usize> {
    if day_book_limit_reached(state) {
        return None;
    }
    ordered
        .iter()
        .copied()
        .find(|book_index| can_start_book(state, *book_index))
}

pub fn progress_order(left: (&Book, f64), right: (&Book, f64)) -> Ordering {
    let left_progress = effective_progress_percent(left.0, left.1);
    let right_progress = effective_progress_percent(right.0, right.1);
    right_progress
        .partial_cmp(&left_progress)
        .unwrap_or(Ordering::Equal)
}

/// Returns the block count needed to start or finish a book on a day.
pub fn start_blocks_for_book(state: &DayState<'_, '_>, book_index: usize) -> i64 {
    let min_blocks = state.books[book_index].book.min_blocks_per_session;
    let remaining_blocks = remaining_blocks_for_book(state, book_index);
    if remaining_blocks <= 0 {
        return min_blocks;
    }
    min_blocks.min(remaining_blocks).max(MIN_START_BLOCKS)
}

pub fn reset_day_state(books: &mut [GreedyBookState<'_>]) {
    for book in books {
        book.assigned_today = 0;
        book.used_today = false;
    }
}

fn effective_progress_percent(book: &Book, remaining_words: f64) -> f64 {
    let base_progress = book
        .progress_percent
        .clamp(MIN_PROGRESS_PERCENT, MAX_PROGRESS_PERCENT);
    let Some(words_total) = book.words_total.filter(|words_total| *words_total > 0) else {
        return base_progress;
    };
    let words_read = (words_total as f64 - remaining_words).max(0.0);
    let progress = (words_read / words_total as f64) * MAX_PROGRESS_PERCENT;
    base_progress.max(progress.clamp(MIN_PROGRESS_PERCENT, MAX_PROGRESS_PERCENT))
}

fn remaining_blocks_for_book(state: &DayState<'_, '_>, book_index: usize) -> i64 {
    let words_per_block = state.books[book_index].words_per_block;
    if words_per_block <= 0 {
        return 0;
    }
    let words_left = state.books[book_index].remaining;
    if words_left <= 0.0 {
        return 0;
    }
    (words_left / words_per_block as f64).ceil() as i64
}

fn room(state: &DayState<'_, '_>, book_index: usize) -> i64 {
    state.books[book_index].day_limit - state.books[book_index].assigned_today
}

fn weekday_mask(book: &Book) -> u8 {
    book.scheduled_days
        .iter()
        .filter_map(|day| weekday_mask_bit(day))
        .fold(0, |mask, bit| mask | bit)
}

fn weekday_mask_bit(day: &str) -> Option<u8> {
    let index = match day {
        "Mon" => 0,
        "Tue" => 1,
        "Wed" => 2,
        "Thu" => 3,
        "Fri" => 4,
        "Sat" => 5,
        "Sun" => 6,
        _ => return None,
    };
    Some(1_u8 << index)
}
