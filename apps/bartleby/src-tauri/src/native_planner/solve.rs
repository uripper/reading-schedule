use std::cmp::Ordering;
use std::collections::HashMap;

use chrono::NaiveDate;

use crate::native_planner::calendar::{
    book_day_block_limit, date_range, day_capacity_blocks, words_per_block,
};
use crate::native_planner::greedy_support::{
    active_book, assign_blocks, books_by_id, deadline_sort_key, next_book, progress_order,
    start_blocks_for_book,
};
use crate::native_planner::models::{priority_order, Assignments, Book, Settings};
use crate::native_planner::{fail_if_cancelled, CancellationCheck};

const MAX_FILL_DAY_ITERATIONS: i64 = 10000;

pub struct DayState<'a> {
    pub assignments: &'a mut Assignments,
    pub books: &'a HashMap<String, Book>,
    pub cap: i64,
    pub daily_book_cap: i64,
    pub day: NaiveDate,
    pub limits: &'a HashMap<String, i64>,
    pub remaining: &'a mut HashMap<String, f64>,
    pub used: Vec<String>,
    pub wpb: &'a HashMap<String, i64>,
}

struct OrderedBookContext<'a> {
    books: &'a HashMap<String, Book>,
    remaining: &'a HashMap<String, f64>,
}

pub fn plan_greedy(
    books: &[Book],
    settings: &Settings,
    should_cancel: &CancellationCheck<'_>,
) -> Result<Assignments, String> {
    let days = date_range(settings.start_date, settings.end_date)?;
    let books_by_id = books_by_id(books);
    let mut assignments = Assignments::new();
    let mut remaining = books
        .iter()
        .map(|book| (book.book_id.clone(), book.remaining_words as f64))
        .collect::<HashMap<_, _>>();
    let limits = books
        .iter()
        .map(|book| (book.book_id.clone(), book_day_block_limit(book, settings)))
        .collect::<HashMap<_, _>>();
    let wpb = books
        .iter()
        .map(|book| (book.book_id.clone(), words_per_block(book, settings)))
        .collect::<HashMap<_, _>>();
    let daily_book_cap = settings
        .max_books_per_day
        .min(settings.max_sessions_per_day);
    let mut day_index = 0;
    while day_index < days.len() && !remaining_words_are_scheduled(&remaining) {
        fail_if_cancelled(should_cancel)?;
        let day = days[day_index];
        let ordered = ordered_books(books, &books_by_id, &remaining);
        let cap = day_capacity_blocks(settings, day).max(0);
        plan_day_with_cap(
            &ordered,
            DayState {
                assignments: &mut assignments,
                books: &books_by_id,
                cap,
                daily_book_cap,
                day,
                limits: &limits,
                remaining: &mut remaining,
                used: Vec::new(),
                wpb: &wpb,
            },
            should_cancel,
        )?;
        day_index += 1;
    }
    Ok(assignments
        .into_iter()
        .filter(|(_, blocks)| *blocks > 0)
        .collect())
}

fn remaining_words_are_scheduled(remaining: &HashMap<String, f64>) -> bool {
    remaining.values().all(|words| *words <= 0.0)
}

fn plan_day(
    ordered: &[String],
    mut state: DayState<'_>,
    should_cancel: &CancellationCheck<'_>,
) -> Result<(), String> {
    fill_day(ordered, &mut state, should_cancel)
}

fn fill_day(
    ordered: &[String],
    state: &mut DayState<'_>,
    should_cancel: &CancellationCheck<'_>,
) -> Result<(), String> {
    let mut iterations = 0;
    while state.cap > 0
        && iterations < MAX_FILL_DAY_ITERATIONS
        && fill_day_iteration(ordered, state)
    {
        fail_if_cancelled(should_cancel)?;
        iterations += 1;
    }
    Ok(())
}

fn ordered_books(
    books: &[Book],
    books_by_id: &HashMap<String, Book>,
    remaining: &HashMap<String, f64>,
) -> Vec<String> {
    let mut ordered = books
        .iter()
        .map(|book| book.book_id.clone())
        .collect::<Vec<_>>();
    let context = OrderedBookContext {
        books: books_by_id,
        remaining,
    };
    ordered.sort_by(|left, right| context.compare(left, right));
    ordered
}

fn start_next_book(state: &mut DayState<'_>, next_book_id: &str) {
    let start_blocks = start_blocks_for_book(state, next_book_id);
    assign_blocks(state, next_book_id, start_blocks);
    state.used.push(next_book_id.to_string());
}

fn fill_day_step(ordered: &[String], state: &mut DayState<'_>) -> bool {
    if let Some(book_id) = active_book(state) {
        assign_blocks(state, &book_id, 1);
        return true;
    }
    let Some(next_book_id) = next_book(ordered, state) else {
        return false;
    };
    start_next_book(state, &next_book_id);
    true
}

fn plan_day_with_cap(
    ordered: &[String],
    state: DayState<'_>,
    should_cancel: &CancellationCheck<'_>,
) -> Result<(), String> {
    if state.cap <= 0 {
        return Ok(());
    }
    plan_day(ordered, state, should_cancel)
}

fn fill_day_iteration(ordered: &[String], state: &mut DayState<'_>) -> bool {
    let previous_cap = state.cap;
    fill_day_step(ordered, state) && state.cap != previous_cap
}

impl OrderedBookContext<'_> {
    fn compare(&self, left: &str, right: &str) -> Ordering {
        let left_book = self.books.get(left).expect("missing book");
        let right_book = self.books.get(right).expect("missing book");
        let deadline_order =
            deadline_sort_key(left_book.deadline).cmp(&deadline_sort_key(right_book.deadline));
        let progress_comparison = progress_order(
            (left_book, self.remaining[left]),
            (right_book, self.remaining[right]),
        );
        let remaining_order = self.remaining[right]
            .partial_cmp(&self.remaining[left])
            .unwrap_or(Ordering::Equal);
        priority_order(left_book.priority, right_book.priority)
            .then(progress_comparison)
            .then(deadline_order)
            .then(remaining_order)
            .then_with(|| left.cmp(right))
    }
}
