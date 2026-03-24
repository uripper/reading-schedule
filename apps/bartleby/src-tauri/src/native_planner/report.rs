use std::collections::HashMap;

use chrono::NaiveDate;
use serde_json::{json, Value};

use crate::native_planner::calendar::{
    calendar_minutes, date_range, required_total_minutes, words_per_block, words_per_minute,
};
use crate::native_planner::models::{Assignments, Book, PlanResult, Settings};

struct Session {
    book_id: String,
    date: NaiveDate,
    minutes: i64,
    session_index: i64,
    title: String,
    words_planned: i64,
}

pub fn build_output(
    books: &[Book],
    settings: &Settings,
    result: &PlanResult,
) -> Result<Value, String> {
    let sessions = sessions(books, settings, &result.assignments)?;
    let per_book_totals = per_book_totals(books, &sessions);
    let total_planned_minutes = sessions.iter().map(|session| session.minutes).sum::<i64>();
    let total_available_minutes = calendar_minutes(settings)?.values().sum::<i64>();
    let total_required_minutes = required_total_minutes(books, settings);
    let feasibility_warning = if total_required_minutes > total_available_minutes {
        Some(format!(
            "Required minutes ({total_required_minutes}) exceed available minutes ({total_available_minutes})."
        ))
    } else {
        None
    };
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
                "book_id": session.book_id,
                "date": session.date.format("%Y-%m-%d").to_string(),
                "minutes": session.minutes,
                "session_index": session.session_index,
                "title": session.title,
                "words_planned": session.words_planned,
            })
        })
        .collect::<Vec<_>>();
    Ok(json!({
        "schedule": schedule,
        "summary": {
            "feasibility_warning": feasibility_warning,
            "note": result.note,
            "objective": result.objective,
            "per_book": per_book,
            "planner": result.planner,
            "status": result.status,
            "total_available_minutes": total_available_minutes,
            "total_planned_minutes": total_planned_minutes,
            "total_required_minutes": total_required_minutes,
            "w_finish": settings.w_finish,
            "w_priority": settings.w_priority,
            "w_smooth": settings.w_smooth,
            "w_switch": settings.w_switch,
        }
    }))
}

fn clip_session(book: &Book, settings: &Settings, blocks: i64, remaining_words: i64) -> (i64, i64) {
    if remaining_words <= 0 {
        return (0, 0);
    }
    let max_minutes = blocks * settings.time_quantum_minutes;
    let max_words = blocks * words_per_block(book, settings);
    let words = max_words.min(remaining_words);
    if words <= 0 {
        return (0, 0);
    }
    let minutes = max_minutes.min((words as f64 / words_per_minute(book, settings)).ceil() as i64);
    (minutes, words)
}

fn day_assignment_items(
    assignments: &Assignments,
    books_by_id: &HashMap<&str, &Book>,
    day: NaiveDate,
) -> Vec<(String, i64)> {
    let mut items = assignments
        .iter()
        .filter(|((_, assigned_day), blocks)| *assigned_day == day && **blocks > 0)
        .map(|((book_id, _), blocks)| (book_id.clone(), *blocks))
        .collect::<Vec<_>>();
    items.sort_by(|(left_id, _), (right_id, _)| {
        books_by_id[left_id.as_str()]
            .priority
            .cmp(&books_by_id[right_id.as_str()].priority)
            .then_with(|| left_id.cmp(right_id))
    });
    items
}

fn sessions(
    books: &[Book],
    settings: &Settings,
    assignments: &Assignments,
) -> Result<Vec<Session>, String> {
    let books_by_id = books
        .iter()
        .map(|book| (book.book_id.as_str(), book))
        .collect::<HashMap<_, _>>();
    let mut remaining = books
        .iter()
        .map(|book| (book.book_id.clone(), book.remaining_words))
        .collect::<HashMap<_, _>>();
    let mut sessions = Vec::new();
    for day in date_range(settings.start_date, settings.end_date)? {
        let items = day_assignment_items(assignments, &books_by_id, day);
        let mut session_index = 0;
        for (book_id, blocks) in items {
            let book = books_by_id[book_id.as_str()];
            let (minutes, words_planned) = clip_session(
                book,
                settings,
                blocks,
                *remaining.get(book_id.as_str()).unwrap_or(&0),
            );
            if words_planned <= 0 {
                continue;
            }
            if let Some(remaining_words) = remaining.get_mut(book_id.as_str()) {
                *remaining_words -= words_planned;
            }
            session_index += 1;
            sessions.push(Session {
                book_id: book.book_id.clone(),
                date: day,
                minutes,
                session_index,
                title: book.title.clone(),
                words_planned,
            });
        }
    }
    Ok(sessions)
}

fn per_book_totals(books: &[Book], sessions: &[Session]) -> HashMap<String, i64> {
    let mut totals = books
        .iter()
        .map(|book| (book.book_id.clone(), 0))
        .collect::<HashMap<_, _>>();
    for session in sessions {
        if let Some(total) = totals.get_mut(session.book_id.as_str()) {
            *total += session.words_planned;
        }
    }
    totals
}
