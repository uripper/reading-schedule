//! Planner report helpers for incomplete schedule status and warnings.

use std::collections::HashMap;

use crate::native_planner::models::{Book, PlanResult, INCOMPLETE_STATUS_NAME};

pub struct FeasibilityWarningContext<'a> {
    pub incomplete_books: &'a [&'a Book],
    pub per_book_totals: &'a HashMap<String, i64>,
    pub total_available_minutes: i64,
    pub total_required_minutes: i64,
}

/// Builds the user-facing feasibility warning for capacity or placement gaps.
pub fn feasibility_warning(context: FeasibilityWarningContext<'_>) -> Option<String> {
    let mut warnings = Vec::new();
    if context.total_required_minutes > context.total_available_minutes {
        warnings.push(format!(
            "Required minutes ({}) exceed available minutes ({}).",
            context.total_required_minutes, context.total_available_minutes
        ));
    }
    if !context.incomplete_books.is_empty() {
        warnings.push(format!(
            "Planner could not schedule all remaining words for: {}.",
            incomplete_book_summaries(context.incomplete_books, context.per_book_totals)
        ));
    }
    if warnings.is_empty() {
        return None;
    }
    Some(warnings.join(" "))
}

/// Returns books that still have unscheduled words after assignment.
pub fn incomplete_books<'a>(
    books: &'a [Book],
    per_book_totals: &HashMap<String, i64>,
) -> Vec<&'a Book> {
    books
        .iter()
        .filter(|book| planned_words_for(book, per_book_totals) < book.remaining_words)
        .collect()
}

/// Returns the planner status exposed in the summary payload.
pub fn summary_status(result: &PlanResult, incomplete_books: &[&Book]) -> String {
    if incomplete_books.is_empty() {
        return result.status.clone();
    }
    INCOMPLETE_STATUS_NAME.to_string()
}

fn incomplete_book_summaries(books: &[&Book], per_book_totals: &HashMap<String, i64>) -> String {
    books
        .iter()
        .map(|book| incomplete_book_summary(book, per_book_totals))
        .collect::<Vec<_>>()
        .join(", ")
}

fn incomplete_book_summary(book: &Book, per_book_totals: &HashMap<String, i64>) -> String {
    let planned_words = planned_words_for(book, per_book_totals);
    format!(
        "{} (planned {} of {} words)",
        book.title, planned_words, book.remaining_words
    )
}

fn planned_words_for(book: &Book, per_book_totals: &HashMap<String, i64>) -> i64 {
    *per_book_totals.get(book.book_id.as_str()).unwrap_or(&0)
}
