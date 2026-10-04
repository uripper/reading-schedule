use std::cmp::Ordering;
use std::collections::HashSet;

use chrono::NaiveDate;

use crate::native_planner::calendar::{date_range, day_capacity_blocks};
use crate::native_planner::greedy_support::{
    active_book, active_book_chunk, assign_blocks, day_weekday_bit, deadline_sort_key,
    indexed_books, next_book, progress_order, reset_day_state, start_blocks_for_book,
    GreedyBookState,
};
use crate::native_planner::models::{priority_order, Assignments, Book, Settings};
use crate::native_planner::{fail_if_cancelled, CancellationCheck};

const MAX_FILL_DAY_ITERATIONS: i64 = 10000;

pub struct DayState<'books, 'state> {
    pub assignments: &'state mut Assignments,
    pub books: &'state mut [GreedyBookState<'books>],
    pub cap: i64,
    pub daily_book_cap: i64,
    pub day: NaiveDate,
    pub reserved_book_ids: HashSet<String>,
    pub unfinished_count: &'state mut usize,
    pub used: Vec<usize>,
    pub weekday_bit: u8,
}

struct OrderedBookContext<'a> {
    books: &'a [GreedyBookState<'a>],
}

pub fn plan_greedy(
    books: &[Book],
    settings: &Settings,
    should_cancel: &CancellationCheck<'_>,
) -> Result<Assignments, String> {
    let days = date_range(settings.start_date, settings.end_date)?;
    let mut assignments = Assignments::new();
    let mut book_states = indexed_books(books, settings);
    let mut unfinished_count = book_states
        .iter()
        .filter(|book_state| book_state.remaining > 0.0)
        .count();
    let mut day_index = 0;
    while day_index < days.len() && unfinished_count > 0 {
        fail_if_cancelled(should_cancel)?;
        let day = days[day_index];
        reset_day_state(&mut book_states);
        let ordered = ordered_books(&book_states);
        let cap = day_capacity_blocks(settings, day).max(0);
        let daily_book_cap = available_book_slots(settings, day);
        plan_day_with_cap(
            &ordered,
            DayState {
                assignments: &mut assignments,
                books: &mut book_states,
                cap,
                daily_book_cap,
                day,
                reserved_book_ids: settings
                    .reserved_book_ids_by_date
                    .get(&day)
                    .cloned()
                    .unwrap_or_default(),
                unfinished_count: &mut unfinished_count,
                used: Vec::new(),
                weekday_bit: day_weekday_bit(day),
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

fn available_book_slots(settings: &Settings, day: NaiveDate) -> i64 {
    let reserved_books = settings
        .reserved_book_ids_by_date
        .get(&day)
        .map(|book_ids| book_ids.len() as i64)
        .unwrap_or(0);
    let reserved_sessions = settings
        .reserved_sessions_by_date
        .get(&day)
        .copied()
        .unwrap_or(0);
    let book_slots = settings.max_books_per_day - reserved_books;
    let session_slots = settings.max_sessions_per_day - reserved_sessions;
    book_slots.min(session_slots).max(0)
}

fn plan_day(
    ordered: &[usize],
    mut state: DayState<'_, '_>,
    should_cancel: &CancellationCheck<'_>,
) -> Result<(), String> {
    fill_day(ordered, &mut state, should_cancel)
}

fn fill_day(
    ordered: &[usize],
    state: &mut DayState<'_, '_>,
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

fn ordered_books(books: &[GreedyBookState<'_>]) -> Vec<usize> {
    let mut ordered = books
        .iter()
        .enumerate()
        .map(|(index, _)| index)
        .collect::<Vec<_>>();
    let context = OrderedBookContext { books };
    ordered.sort_by(|left, right| context.compare(left, right));
    ordered
}

fn start_next_book(state: &mut DayState<'_, '_>, next_book_index: usize) {
    let start_blocks = start_blocks_for_book(state, next_book_index);
    assign_blocks(state, next_book_index, start_blocks);
    state.books[next_book_index].used_today = true;
    state.used.push(next_book_index);
}

fn assign_active_book(state: &mut DayState<'_, '_>, book_index: usize) -> bool {
    let blocks = active_book_chunk(state, book_index);
    if blocks <= 0 {
        return false;
    }
    assign_blocks(state, book_index, blocks);
    true
}

fn fill_day_step(ordered: &[usize], state: &mut DayState<'_, '_>) -> bool {
    if let Some(book_index) = active_book(state) {
        return assign_active_book(state, book_index);
    }
    let Some(next_book_index) = next_book(ordered, state) else {
        return false;
    };
    start_next_book(state, next_book_index);
    true
}

fn plan_day_with_cap(
    ordered: &[usize],
    state: DayState<'_, '_>,
    should_cancel: &CancellationCheck<'_>,
) -> Result<(), String> {
    if state.cap <= 0 {
        return Ok(());
    }
    plan_day(ordered, state, should_cancel)
}

fn fill_day_iteration(ordered: &[usize], state: &mut DayState<'_, '_>) -> bool {
    let previous_cap = state.cap;
    fill_day_step(ordered, state) && state.cap != previous_cap
}

impl OrderedBookContext<'_> {
    fn compare(&self, left: &usize, right: &usize) -> Ordering {
        let left_state = &self.books[*left];
        let right_state = &self.books[*right];
        let left_book = left_state.book;
        let right_book = right_state.book;
        let deadline_order =
            deadline_sort_key(left_book.deadline).cmp(&deadline_sort_key(right_book.deadline));
        let progress_comparison = progress_order(
            (left_book, left_state.remaining),
            (right_book, right_state.remaining),
        );
        let remaining_order = left_state
            .remaining
            .partial_cmp(&right_state.remaining)
            .unwrap_or(Ordering::Equal);
        priority_order(left_book.priority, right_book.priority)
            .then(progress_comparison)
            .then(deadline_order)
            .then(remaining_order)
            .then_with(|| left_book.book_id.cmp(&right_book.book_id))
    }
}
