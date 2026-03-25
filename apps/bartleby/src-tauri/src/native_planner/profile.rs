use std::collections::HashMap;

use crate::native_planner::calendar::words_per_block;
use crate::native_planner::models::{
    Assignments, Book, PlanResult, Settings, SolverProfile, FEASIBLE_STATUS_NAME,
    PLAN_MODE_SPREAD_OUT,
};
use crate::native_planner::solve::plan_greedy;

const FAST_MODE_NOTE: &str = "Fast mode uses greedy planner.";
const GREEDY_PLANNER_NAME: &str = "greedy";
const GREEDY_PROFILE_FALLBACK_NOTE: &str =
    "Rust staged planner produced no feasible solution (INFEASIBLE); fell back to greedy planner.";
const PROFILE_BALANCED_NOTE: &str = "Native Rust balanced staged planner.";
const PROFILE_THOROUGH_NOTE: &str = "Native Rust thorough staged planner.";
const SCORE_FINISHED_MULTIPLIER: i64 = 1_000_000;
const STAGED_PLANNER_NAME: &str = "rust-staged";

pub fn solve(books: &[Book], settings: &Settings) -> Result<PlanResult, String> {
    match settings.solver_profile {
        SolverProfile::Fast => fast_profile_result(books, settings),
        SolverProfile::Balanced | SolverProfile::Thorough => staged_profile_result(books, settings),
    }
}

fn fast_profile_result(books: &[Book], settings: &Settings) -> Result<PlanResult, String> {
    let assignments = plan_greedy(books, settings)?;
    Ok(PlanResult {
        assignments,
        note: FAST_MODE_NOTE.to_string(),
        objective: None,
        planner: GREEDY_PLANNER_NAME.to_string(),
        status: FEASIBLE_STATUS_NAME.to_string(),
    })
}

fn finished_book_count(books: &[Book], settings: &Settings, assignments: &Assignments) -> i64 {
    let planned_words = planned_words_by_book(books, settings, assignments);
    books
        .iter()
        .filter(|book| {
            planned_words
                .get(book.book_id.as_str())
                .copied()
                .unwrap_or(0)
                >= book.remaining_words
        })
        .count() as i64
}

fn greedy_fallback_result(
    books: &[Book],
    settings: &Settings,
    greedy_assignments: Assignments,
) -> PlanResult {
    let objective = Some(objective_score(books, settings, &greedy_assignments));
    PlanResult {
        assignments: greedy_assignments,
        note: GREEDY_PROFILE_FALLBACK_NOTE.to_string(),
        objective,
        planner: GREEDY_PLANNER_NAME.to_string(),
        status: FEASIBLE_STATUS_NAME.to_string(),
    }
}

fn objective_score(books: &[Book], settings: &Settings, assignments: &Assignments) -> i64 {
    let planned_words = planned_words_by_book(books, settings, assignments);
    let finished_books = finished_book_count(books, settings, assignments);
    let total_words = planned_words.values().copied().sum::<i64>();
    finished_books * SCORE_FINISHED_MULTIPLIER + total_words
}

fn planned_words_by_book(
    books: &[Book],
    settings: &Settings,
    assignments: &Assignments,
) -> HashMap<String, i64> {
    let words_per_block_by_book = books
        .iter()
        .map(|book| (book.book_id.clone(), words_per_block(book, settings)))
        .collect::<HashMap<_, _>>();
    let mut planned_words = books
        .iter()
        .map(|book| (book.book_id.clone(), 0))
        .collect::<HashMap<_, _>>();
    for ((book_id, _day), blocks) in assignments {
        let words_for_book = *words_per_block_by_book.get(book_id).unwrap_or(&0) * *blocks;
        add_planned_words(&mut planned_words, book_id, words_for_book);
    }
    planned_words
}

fn add_planned_words(planned_words: &mut HashMap<String, i64>, book_id: &str, words: i64) {
    let Some(total) = planned_words.get_mut(book_id) else {
        return;
    };
    *total += words;
}

fn profile_note(solver_profile: &SolverProfile) -> &'static str {
    match solver_profile {
        SolverProfile::Fast => FAST_MODE_NOTE,
        SolverProfile::Balanced => PROFILE_BALANCED_NOTE,
        SolverProfile::Thorough => PROFILE_THOROUGH_NOTE,
    }
}

fn staged_attempt_settings(settings: &Settings) -> Settings {
    let mut staged_settings = settings.clone();
    staged_settings.plan_mode = PLAN_MODE_SPREAD_OUT.to_string();
    staged_settings
}

fn staged_profile_result(books: &[Book], settings: &Settings) -> Result<PlanResult, String> {
    let greedy_assignments = plan_greedy(books, settings)?;
    let staged_settings = staged_attempt_settings(settings);
    let staged_assignments = plan_greedy(books, &staged_settings)?;
    if objective_score(books, settings, &staged_assignments)
        <= objective_score(books, settings, &greedy_assignments)
    {
        return Ok(greedy_fallback_result(books, settings, greedy_assignments));
    }
    Ok(PlanResult {
        assignments: staged_assignments.clone(),
        note: profile_note(&settings.solver_profile).to_string(),
        objective: Some(objective_score(books, settings, &staged_assignments)),
        planner: STAGED_PLANNER_NAME.to_string(),
        status: FEASIBLE_STATUS_NAME.to_string(),
    })
}
