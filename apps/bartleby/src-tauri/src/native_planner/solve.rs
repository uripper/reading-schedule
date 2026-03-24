use std::cmp::Ordering;
use std::collections::HashMap;

use chrono::NaiveDate;

use crate::native_planner::calendar::{
    book_day_block_limit, book_is_scheduled_for_day, date_range, day_capacity_blocks,
    words_per_block,
};
use crate::native_planner::models::{
    Assignments, Book, PlanResult, Settings, FEASIBLE_STATUS_NAME, NATIVE_PLANNER_NAME,
    NATIVE_PLANNER_NOTE, PLAN_MODE_SPREAD_OUT,
};

struct DayState<'a> {
    assignments: &'a mut Assignments,
    books: &'a HashMap<String, Book>,
    cap: i64,
    daily_book_cap: i64,
    day: NaiveDate,
    limits: &'a HashMap<String, i64>,
    remaining: &'a mut HashMap<String, f64>,
    used: Vec<String>,
    wpb: &'a HashMap<String, i64>,
}

pub fn solve(books: &[Book], settings: &Settings) -> Result<PlanResult, String> {
    let assignments = plan_greedy(books, settings)?;
    Ok(PlanResult {
        assignments,
        note: NATIVE_PLANNER_NOTE.to_string(),
        objective: None,
        planner: NATIVE_PLANNER_NAME.to_string(),
        status: FEASIBLE_STATUS_NAME.to_string(),
    })
}

fn plan_greedy(books: &[Book], settings: &Settings) -> Result<Assignments, String> {
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
        let cap = greedy_cap_for_day(
            settings,
            day,
            day_index,
            &days,
            &caps,
            &books_by_id,
            &remaining,
            &wpb,
            &ordered,
        );
        if cap <= 0 {
            continue;
        }
        plan_day(
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
    for book_id in ordered {
        if day_book_limit_reached(state) {
            return;
        }
        if !can_start_book(state, book_id) {
            continue;
        }
        let min_blocks = state.books[book_id].min_blocks_per_session;
        assign_blocks(state, book_id, min_blocks);
        state.used.push(book_id.clone());
    }
}

fn fill_day(ordered: &[String], state: &mut DayState<'_>) {
    while state.cap > 0 {
        if let Some(book_id) = active_book(state) {
            assign_blocks(state, &book_id, 1);
            continue;
        }
        let Some(next_book) = next_book(ordered, state) else {
            return;
        };
        let min_blocks = state.books[&next_book].min_blocks_per_session;
        assign_blocks(state, &next_book, min_blocks);
        state.used.push(next_book);
    }
}

fn ordered_books(books: &[Book], remaining: &HashMap<String, f64>) -> Vec<String> {
    let mut ordered = books
        .iter()
        .map(|book| book.book_id.clone())
        .collect::<Vec<_>>();
    ordered.sort_by(|left, right| compare_books(left, right, books, remaining));
    ordered
}

fn compare_books(
    left: &str,
    right: &str,
    books: &[Book],
    remaining: &HashMap<String, f64>,
) -> Ordering {
    let left_book = books
        .iter()
        .find(|book| book.book_id == left)
        .expect("missing book");
    let right_book = books
        .iter()
        .find(|book| book.book_id == right)
        .expect("missing book");
    left_book
        .priority
        .cmp(&right_book.priority)
        .then_with(|| {
            deadline_sort_key(left_book.deadline).cmp(&deadline_sort_key(right_book.deadline))
        })
        .then_with(|| {
            remaining[right]
                .partial_cmp(&remaining[left])
                .unwrap_or(Ordering::Equal)
        })
        .then_with(|| left.cmp(right))
}

fn greedy_cap_for_day(
    settings: &Settings,
    day: NaiveDate,
    day_index: usize,
    days: &[NaiveDate],
    caps: &HashMap<NaiveDate, i64>,
    books: &HashMap<String, Book>,
    remaining: &HashMap<String, f64>,
    wpb: &HashMap<String, i64>,
    ordered: &[String],
) -> i64 {
    let cap = *caps.get(&day).unwrap_or(&0);
    if cap <= 0 || settings.plan_mode != PLAN_MODE_SPREAD_OUT {
        return cap.max(0);
    }
    cap.min(spread_cap_for_day(
        day, day_index, days, caps, books, remaining, wpb, ordered,
    ))
}

fn spread_cap_for_day(
    day: NaiveDate,
    day_index: usize,
    days: &[NaiveDate],
    caps: &HashMap<NaiveDate, i64>,
    books: &HashMap<String, Book>,
    remaining: &HashMap<String, f64>,
    wpb: &HashMap<String, i64>,
    ordered: &[String],
) -> i64 {
    let remaining_blocks = remaining
        .iter()
        .filter_map(|(book_id, words_left)| {
            if *words_left <= 0.0 || *wpb.get(book_id).unwrap_or(&0) <= 0 {
                return None;
            }
            Some((words_left / *wpb.get(book_id).unwrap_or(&1) as f64).ceil() as i64)
        })
        .sum::<i64>();
    if remaining_blocks <= 0 {
        return 0;
    }
    let active_days_left = days[day_index..]
        .iter()
        .filter(|day| *caps.get(day).unwrap_or(&0) > 0)
        .count() as i64;
    if active_days_left <= 0 {
        return remaining_blocks;
    }
    let mut target = (remaining_blocks as f64 / active_days_left as f64).ceil() as i64;
    if let Some(min_seed) = ordered
        .iter()
        .filter(|book_id| remaining[*book_id] > 0.0)
        .filter_map(|book_id| books.get(book_id))
        .filter(|book| is_unlocked(book, remaining) && book_is_scheduled_for_day(book, day))
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

fn active_book(state: &DayState<'_>) -> Option<String> {
    let mut active = state
        .used
        .iter()
        .filter(|book_id| is_active_book(state, book_id))
        .cloned()
        .collect::<Vec<_>>();
    active.sort_by(|left, right| {
        let left_book = &state.books[left];
        let right_book = &state.books[right];
        left_book
            .priority
            .cmp(&right_book.priority)
            .then_with(|| left_book.difficulty.cmp(&right_book.difficulty))
            .then_with(|| left.cmp(right))
    });
    active.into_iter().next()
}

fn next_book(ordered: &[String], state: &DayState<'_>) -> Option<String> {
    if day_book_limit_reached(state) {
        return None;
    }
    ordered
        .iter()
        .find(|book_id| can_start_book(state, book_id))
        .cloned()
}

fn assign_blocks(state: &mut DayState<'_>, book_id: &str, blocks: i64) {
    let key = (book_id.to_string(), state.day);
    *state.assignments.entry(key).or_insert(0) += blocks;
    *state.remaining.entry(book_id.to_string()).or_insert(0.0) =
        (*state.remaining.get(book_id).unwrap_or(&0.0)
            - blocks as f64 * *state.wpb.get(book_id).unwrap_or(&0) as f64)
            .max(0.0);
    state.cap -= blocks;
}

fn can_start_book(state: &DayState<'_>, book_id: &str) -> bool {
    !state.used.contains(&book_id.to_string())
        && *state.remaining.get(book_id).unwrap_or(&0.0) > 0.0
        && is_unlocked(&state.books[book_id], state.remaining)
        && book_is_scheduled_for_day(&state.books[book_id], state.day)
        && state.cap >= state.books[book_id].min_blocks_per_session
        && room(state, book_id) >= state.books[book_id].min_blocks_per_session
}

fn day_book_limit_reached(state: &DayState<'_>) -> bool {
    state.used.len() as i64 >= state.daily_book_cap
}

fn is_active_book(state: &DayState<'_>, book_id: &str) -> bool {
    *state.remaining.get(book_id).unwrap_or(&0.0) > 0.0
        && is_unlocked(&state.books[book_id], state.remaining)
        && book_is_scheduled_for_day(&state.books[book_id], state.day)
        && room(state, book_id) > 0
}

fn is_unlocked(book: &Book, remaining: &HashMap<String, f64>) -> bool {
    match &book.blocked_by {
        Some(blocker) => remaining.get(blocker).copied().unwrap_or(0.0) <= 0.0,
        None => true,
    }
}

fn room(state: &DayState<'_>, book_id: &str) -> i64 {
    let assigned = state
        .assignments
        .get(&(book_id.to_string(), state.day))
        .copied()
        .unwrap_or(0);
    state.limits.get(book_id).copied().unwrap_or(0) - assigned
}

fn books_by_id(books: &[Book]) -> HashMap<String, Book> {
    books
        .iter()
        .cloned()
        .map(|book| (book.book_id.clone(), book))
        .collect()
}

fn deadline_sort_key(deadline: Option<NaiveDate>) -> NaiveDate {
    deadline
        .unwrap_or_else(|| NaiveDate::from_ymd_opt(9999, 12, 31).expect("valid far future date"))
}
