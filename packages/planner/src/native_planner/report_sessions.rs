//! Turns greedy block assignments into dated reading sessions for the report.
//!
//! Plans can run for centuries and hold hundreds of thousands of sessions, so
//! this works on book indexes and plain arrays rather than string-keyed maps.

use std::collections::HashMap;

use chrono::{Datelike, NaiveDate};

use crate::native_planner::calendar::{words_per_block, words_per_minute};
use crate::native_planner::models::{Assignments, Book, Settings};

/// Years that `%Y` prints as exactly four zero-padded digits.
const FOUR_DIGIT_YEARS: std::ops::RangeInclusive<i32> = 0..=9999;

pub struct Session<'a> {
    pub book: &'a Book,
    pub date: NaiveDate,
    pub finish: bool,
    pub minutes: i64,
    pub session_index: i64,
    pub words_planned: i64,
}

struct Assignment {
    blocks: i64,
    book_index: usize,
    day: NaiveDate,
}

/// Words left and finish flags per book, plus the running session number for the current day.
struct SessionState<'a> {
    books: &'a [Book],
    day: Option<NaiveDate>,
    finished: Vec<bool>,
    remaining: Vec<i64>,
    session_index: i64,
    settings: &'a Settings,
}

/// Sessions in date order; within a day, by book priority and then book ID.
pub fn sessions<'a>(
    books: &'a [Book],
    settings: &'a Settings,
    assignments: &Assignments,
) -> Vec<Session<'a>> {
    let mut state = SessionState {
        books,
        day: None,
        finished: vec![false; books.len()],
        remaining: books.iter().map(|book| book.remaining_words).collect(),
        session_index: 0,
        settings,
    };
    sorted_assignments(books, assignments)
        .into_iter()
        .filter_map(|assignment| state.session(&assignment))
        .collect()
}

/// Words planned per book ID, including books with no sessions.
pub fn per_book_totals(books: &[Book], sessions: &[Session<'_>]) -> HashMap<String, i64> {
    let mut totals = books
        .iter()
        .map(|book| (book.book_id.as_str(), 0))
        .collect::<HashMap<_, _>>();
    for session in sessions {
        if let Some(total) = totals.get_mut(session.book.book_id.as_str()) {
            *total += session.words_planned;
        }
    }
    totals
        .into_iter()
        .map(|(book_id, total)| (book_id.to_string(), total))
        .collect()
}

/// Formats like chrono's `%Y-%m-%d`, without re-reading the format string per session.
pub fn day_key(date: NaiveDate) -> String {
    if !FOUR_DIGIT_YEARS.contains(&date.year()) {
        return date.format("%Y-%m-%d").to_string();
    }
    format!("{:04}-{:02}-{:02}", date.year(), date.month(), date.day())
}

fn sorted_assignments(books: &[Book], assignments: &Assignments) -> Vec<Assignment> {
    let book_indexes = books
        .iter()
        .enumerate()
        .map(|(index, book)| (book.book_id.as_str(), index))
        .collect::<HashMap<_, _>>();
    let mut sorted = assignments
        .iter()
        .filter(|(_, blocks)| **blocks > 0)
        .filter_map(|((book_id, day), blocks)| {
            let book_index = *book_indexes.get(book_id.as_str())?;
            Some(Assignment {
                blocks: *blocks,
                book_index,
                day: *day,
            })
        })
        .collect::<Vec<_>>();
    sorted.sort_unstable_by(|left, right| {
        let left_book = &books[left.book_index];
        let right_book = &books[right.book_index];
        left.day
            .cmp(&right.day)
            .then_with(|| left_book.priority.cmp(&right_book.priority))
            .then_with(|| left_book.book_id.cmp(&right_book.book_id))
    });
    sorted
}

impl<'a> SessionState<'a> {
    /// Builds the next session, or none when the book has no words left to plan.
    fn session(&mut self, assignment: &Assignment) -> Option<Session<'a>> {
        self.start_day(assignment.day);
        let index = assignment.book_index;
        let book = &self.books[index];
        let (minutes, words_planned) = clip_session(
            self.settings,
            book,
            assignment.blocks,
            self.remaining[index],
        )?;
        self.remaining[index] -= words_planned;
        let finish = !self.finished[index] && self.remaining[index] <= 0;
        self.finished[index] |= finish;
        self.session_index += 1;
        Some(Session {
            book,
            date: assignment.day,
            finish,
            minutes,
            session_index: self.session_index,
            words_planned,
        })
    }

    /// Session numbers continue after any sessions kept from the existing schedule.
    fn start_day(&mut self, day: NaiveDate) {
        if self.day == Some(day) {
            return;
        }
        self.day = Some(day);
        self.session_index = self
            .settings
            .reserved_sessions_by_date
            .get(&day)
            .copied()
            .unwrap_or(0);
    }
}

/// Minutes and words for a session, limited by the words the book has left.
fn clip_session(
    settings: &Settings,
    book: &Book,
    blocks: i64,
    remaining_words: i64,
) -> Option<(i64, i64)> {
    if remaining_words <= 0 {
        return None;
    }
    let max_minutes = blocks * settings.time_quantum_minutes;
    let words = (blocks * words_per_block(book, settings)).min(remaining_words);
    if words <= 0 {
        return None;
    }
    let minutes = max_minutes.min((words as f64 / words_per_minute(book, settings)).ceil() as i64);
    Some((minutes, words))
}
