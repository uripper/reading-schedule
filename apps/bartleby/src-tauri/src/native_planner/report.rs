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
    finish: bool,
    minutes: i64,
    session_index: i64,
    title: String,
    words_planned: i64,
}

struct SessionBuilder<'a> {
    books_by_id: &'a HashMap<&'a str, &'a Book>,
    day: NaiveDate,
    finished_books: &'a mut HashMap<String, bool>,
    remaining: &'a mut HashMap<String, i64>,
    session_index: &'a mut i64,
    settings: &'a Settings,
}

struct SessionClip<'a> {
    blocks: i64,
    book: &'a Book,
    remaining_words: i64,
}

struct DaySessions<'a> {
    assignments: &'a Assignments,
    books_by_id: &'a HashMap<&'a str, &'a Book>,
    day: NaiveDate,
    finished_books: &'a mut HashMap<String, bool>,
    remaining: &'a mut HashMap<String, i64>,
    settings: &'a Settings,
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
                "finish": session.finish,
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

fn clip_session(settings: &Settings, clip: SessionClip<'_>) -> (i64, i64) {
    let book = clip.book;
    let blocks = clip.blocks;
    let remaining_words = clip.remaining_words;
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
    let mut finished_books = HashMap::new();
    let mut sessions = Vec::new();
    for day in date_range(settings.start_date, settings.end_date)? {
        sessions.extend(sessions_for_day(DaySessions {
            assignments,
            books_by_id: &books_by_id,
            day,
            finished_books: &mut finished_books,
            remaining: &mut remaining,
            settings,
        }));
    }
    Ok(sessions)
}

fn per_book_totals(books: &[Book], sessions: &[Session]) -> HashMap<String, i64> {
    let mut totals = books
        .iter()
        .map(|book| (book.book_id.clone(), 0))
        .collect::<HashMap<_, _>>();
    for session in sessions {
        add_session_words(&mut totals, session);
    }
    totals
}

fn add_session_words(totals: &mut HashMap<String, i64>, session: &Session) {
    let Some(total) = totals.get_mut(session.book_id.as_str()) else {
        return;
    };
    *total += session.words_planned;
}

fn subtract_remaining_words(
    remaining: &mut HashMap<String, i64>,
    book_id: &str,
    words_planned: i64,
) {
    let Some(remaining_words) = remaining.get_mut(book_id) else {
        return;
    };
    *remaining_words -= words_planned;
}

impl<'a> SessionBuilder<'a> {
    fn build(&mut self, book_id: &str, blocks: i64) -> Option<Session> {
        let book = self.books_by_id[book_id];
        let (minutes, words_planned) = planned_session(
            self.settings,
            SessionClip {
                blocks,
                book,
                remaining_words: *self.remaining.get(book_id).unwrap_or(&0),
            },
        )?;
        subtract_remaining_words(self.remaining, book_id, words_planned);
        let finish = self.calculate_finish(book_id);
        *self.session_index += 1;
        Some(Session {
            book_id: book.book_id.clone(),
            date: self.day,
            finish,
            minutes,
            session_index: *self.session_index,
            title: book.title.clone(),
            words_planned,
        })
    }

    fn calculate_finish(&mut self, book_id: &str) -> bool {
        if self.finished_books.get(book_id).copied().unwrap_or(false) {
            return false;
        }
        let book = self.books_by_id[book_id];
        let remaining = *self.remaining.get(book_id).unwrap_or(&0);
        if remaining <= 0 {
            self.finished_books.insert(book_id.to_string(), true);
            return true;
        }
        false
    }
}

fn planned_session(settings: &Settings, session_clip: SessionClip<'_>) -> Option<(i64, i64)> {
    let session = clip_session(settings, session_clip);
    if session.1 <= 0 {
        return None;
    }
    Some(session)
}

fn sessions_for_day(day_sessions: DaySessions<'_>) -> Vec<Session> {
    let items = day_assignment_items(
        day_sessions.assignments,
        day_sessions.books_by_id,
        day_sessions.day,
    );
    let mut session_index = 0;
    let mut session_builder = SessionBuilder {
        books_by_id: day_sessions.books_by_id,
        day: day_sessions.day,
        finished_books: day_sessions.finished_books,
        remaining: day_sessions.remaining,
        session_index: &mut session_index,
        settings: day_sessions.settings,
    };
    items
        .into_iter()
        .filter_map(|(book_id, blocks)| session_builder.build(&book_id, blocks))
        .collect()
}
