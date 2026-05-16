//! Planner report helpers for incomplete schedule status and warnings.

use std::collections::HashMap;

use crate::native_planner::models::{Book, PlanResult, INCOMPLETE_STATUS_NAME};

/// Builds the user-facing feasibility warning for capacity or placement gaps.
pub fn feasibility_warning(
    total_required_minutes: i64,
    total_available_minutes: i64,
    incomplete_books: &[&Book],
) -> Option<String> {
    let mut warnings = Vec::new();
    if total_required_minutes > total_available_minutes {
        warnings.push(format!(
            "Required minutes ({total_required_minutes}) exceed available minutes ({total_available_minutes})."
        ));
    }
    if !incomplete_books.is_empty() {
        warnings.push(format!(
            "Planner could not schedule all remaining words for: {}.",
            incomplete_book_titles(incomplete_books)
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

fn incomplete_book_titles(books: &[&Book]) -> String {
    books
        .iter()
        .map(|book| book.title.as_str())
        .collect::<Vec<_>>()
        .join(", ")
}

fn planned_words_for(book: &Book, per_book_totals: &HashMap<String, i64>) -> i64 {
    *per_book_totals.get(book.book_id.as_str()).unwrap_or(&0)
}
