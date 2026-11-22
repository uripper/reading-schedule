use serde_json::{json, Value};

use crate::native_planner::calendar::{required_total_minutes, total_available_minutes};
use crate::native_planner::models::{Book, PlanResult, Settings};
use crate::native_planner::report_sessions::{day_key, per_book_totals, sessions};
use crate::native_planner::report_status::{
    feasibility_warning, incomplete_books, summary_status, FeasibilityWarningContext,
};

pub fn build_output(
    books: &[Book],
    settings: &Settings,
    result: &PlanResult,
) -> Result<Value, String> {
    let sessions = sessions(books, settings, &result.assignments);
    let per_book_totals = per_book_totals(books, &sessions);
    let total_planned_minutes = sessions.iter().map(|session| session.minutes).sum::<i64>();
    let total_available_minutes = total_available_minutes(settings, result.horizon_end)?;
    let total_required_minutes = required_total_minutes(books, settings);
    let incomplete_books = incomplete_books(books, &per_book_totals);
    let feasibility_warning = feasibility_warning(FeasibilityWarningContext {
        incomplete_books: &incomplete_books,
        per_book_totals: &per_book_totals,
        total_required_minutes,
        total_available_minutes,
    });
    let per_book = books
        .iter()
        .map(|book| {
            let planned_words = *per_book_totals.get(book.book_id.as_str()).unwrap_or(&0);
            (
                book.book_id.clone(),
                json!({
                    "finished": planned_words >= book.remaining_words,
                    "planned_words": planned_words,
                    "remaining_words": book.remaining_words,
                    "title": book.title,
                }),
            )
        })
        .collect::<serde_json::Map<_, _>>();
    let schedule = sessions
        .into_iter()
        .map(|session| {
            json!({
                "book_id": session.book.book_id,
                "date": day_key(session.date),
                "finish": session.finish,
                "minutes": session.minutes,
                "session_index": session.session_index,
                "title": session.book.title,
                "words_planned": session.words_planned,
            })
        })
        .collect::<Vec<_>>();
    // Built without `schedule`, then moved in: interpolating it into `json!`
    // would deep-copy every session object.
    let mut output = json!({
        "summary": {
            "deprecation_notice": result.deprecation_notice,
            "feasibility_warning": feasibility_warning,
            "note": result.note,
            "objective": result.objective,
            "per_book": per_book,
            "planner": result.planner,
            "status": summary_status(result, &incomplete_books),
            "total_available_minutes": total_available_minutes,
            "total_planned_minutes": total_planned_minutes,
            "total_required_minutes": total_required_minutes,
            "w_finish": settings.w_finish,
            "w_priority": settings.w_priority,
            "w_smooth": settings.w_smooth,
            "w_switch": settings.w_switch,
        }
    });
    output["schedule"] = Value::Array(schedule);
    Ok(output)
}
