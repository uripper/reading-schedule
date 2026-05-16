use std::cmp::Ordering;
use std::collections::HashMap;

use chrono::NaiveDate;

use crate::native_planner::calendar::{
    book_day_block_limit, book_is_scheduled_for_day, date_range, day_capacity_blocks,
    words_per_block,
};
use crate::native_planner::greedy_support::{
    active_book, assign_blocks, books_by_id, can_start_book, day_book_limit_reached,
    deadline_sort_key, is_unlocked, next_book, start_blocks_for_book,
};
use crate::native_planner::models::{
    priority_order, Assignments, Book, Settings, PLAN_MODE_SPREAD_OUT,
};

const MAX_FILL_DAY_ITERATIONS: i64 = 10000;
const MAX_SEED_DAY_ITERATIONS: i64 = 1000;

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
    books: &'a [Book],
    remaining: &'a HashMap<String, f64>,
}

struct CapContext<'a> {
    books: &'a HashMap<String, Book>,
    caps: &'a HashMap<NaiveDate, i64>,
    day: NaiveDate,
    day_index: usize,
    days: &'a [NaiveDate],
    ordered: &'a [String],
    remaining: &'a HashMap<String, f64>,
    settings: &'a Settings,
    wpb: &'a HashMap<String, i64>,
}

pub fn plan_greedy(books: &[Book], settings: &Settings) -> Result<Assignments, String> {
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
    let caps = days
        .iter()
        .copied()
        .map(|day| (day, day_capacity_blocks(settings, day)))
        .collect::<HashMap<_, _>>();
    let daily_book_cap = settings
        .max_books_per_day
        .min(settings.max_sessions_per_day);
    for (day_index, day) in days.iter().copied().enumerate() {
        let ordered = ordered_books(books, &remaining);
        let cap = greedy_cap_for_day(&CapContext {
            books: &books_by_id,
            caps: &caps,
            day,
            day_index,
            days: &days,
            ordered: &ordered,
            remaining: &remaining,
            settings,
            wpb: &wpb,
        });
        plan_day_with_cap(
            cap,
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
        );
    }
    Ok(assignments
        .into_iter()
        .filter(|(_, blocks)| *blocks > 0)
        .collect())
}

fn plan_day(ordered: &[String], mut state: DayState<'_>) {
    seed_day(ordered, &mut state);
    fill_day(ordered, &mut state);
}

fn seed_day(ordered: &[String], state: &mut DayState<'_>) {
    let mut index = 0;
    let mut iterations = 0;
    while index < ordered.len()
        && iterations < MAX_SEED_DAY_ITERATIONS
        && seed_day_iteration(ordered, state, &mut index)
    {
        iterations += 1;
    }
}

fn fill_day(ordered: &[String], state: &mut DayState<'_>) {
    let mut iterations = 0;
    while state.cap > 0
        && iterations < MAX_FILL_DAY_ITERATIONS
        && fill_day_iteration(ordered, state)
    {
        iterations += 1;
    }
}

fn ordered_books(books: &[Book], remaining: &HashMap<String, f64>) -> Vec<String> {
    let mut ordered = books
        .iter()
        .map(|book| book.book_id.clone())
        .collect::<Vec<_>>();
    let context = OrderedBookContext { books, remaining };
    ordered.sort_by(|left, right| context.compare(left, right));
    ordered
}

fn greedy_cap_for_day(context: &CapContext<'_>) -> i64 {
    let cap = *context.caps.get(&context.day).unwrap_or(&0);
    if cap <= 0 || context.settings.plan_mode != PLAN_MODE_SPREAD_OUT {
        return cap.max(0);
    }
    cap.min(spread_cap_for_day(context))
}

fn spread_cap_for_day(context: &CapContext<'_>) -> i64 {
    let remaining_blocks = context
        .remaining
        .iter()
        .filter_map(|(book_id, words_left)| remaining_book_blocks(context, book_id, *words_left))
        .sum::<i64>();
    if remaining_blocks <= 0 {
        return 0;
    }
    let active_days_left = context.days[context.day_index..]
        .iter()
        .filter(|day| *context.caps.get(day).unwrap_or(&0) > 0)
        .count() as i64;
    if active_days_left <= 0 {
        return remaining_blocks;
    }
    let mut target = (remaining_blocks as f64 / active_days_left as f64).ceil() as i64;
    if let Some(min_seed) = context
        .ordered
        .iter()
        .filter(|book_id| context.remaining[*book_id] > 0.0)
        .filter_map(|book_id| context.books.get(book_id))
        .filter(|book| {
            is_unlocked(book, context.remaining) && book_is_scheduled_for_day(book, context.day)
        })
        .map(|book| book.min_blocks_per_session)
        .next()
    {
        target = target.max(min_seed);
    }
    if target <= 0 {
        return 0;
    }
    target
}

fn remaining_book_blocks(context: &CapContext<'_>, book_id: &str, words_left: f64) -> Option<i64> {
    let words_per_block = *context.wpb.get(book_id).unwrap_or(&0);
    if words_left <= 0.0 || words_per_block <= 0 {
        return None;
    }
    Some((words_left / words_per_block as f64).ceil() as i64)
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

fn plan_day_with_cap(cap: i64, ordered: &[String], state: DayState<'_>) {
    if cap <= 0 {
        return;
    }
    plan_day(ordered, state);
}

fn seed_book(state: &mut DayState<'_>, book_id: &str) {
    if !can_start_book(state, book_id) {
        return;
    }
    let start_blocks = start_blocks_for_book(state, book_id);
    assign_blocks(state, book_id, start_blocks);
    state.used.push(book_id.to_string());
}

fn fill_day_iteration(ordered: &[String], state: &mut DayState<'_>) -> bool {
    let previous_cap = state.cap;
    fill_day_step(ordered, state) && state.cap != previous_cap
}

fn seed_day_iteration(ordered: &[String], state: &mut DayState<'_>, index: &mut usize) -> bool {
    let book_id = &ordered[*index];
    if !seed_day_step(state, book_id) {
        return false;
    }
    *index += 1;
    true
}

impl OrderedBookContext<'_> {
    fn compare(&self, left: &str, right: &str) -> Ordering {
        let left_book = self
            .books
            .iter()
            .find(|book| book.book_id == left)
            .expect("missing book");
        let right_book = self
            .books
            .iter()
            .find(|book| book.book_id == right)
            .expect("missing book");
        let deadline_order =
            deadline_sort_key(left_book.deadline).cmp(&deadline_sort_key(right_book.deadline));
        let remaining_order = self.remaining[right]
            .partial_cmp(&self.remaining[left])
            .unwrap_or(Ordering::Equal);
        priority_order(left_book.priority, right_book.priority)
            .then(deadline_order)
            .then(remaining_order)
            .then_with(|| left.cmp(right))
    }
}

fn seed_day_step(state: &mut DayState<'_>, book_id: &str) -> bool {
    if day_book_limit_reached(state) {
        return false;
    }
    seed_book(state, book_id);
    true
}
