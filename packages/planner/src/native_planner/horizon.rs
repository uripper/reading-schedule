//! Decides how far the greedy planner walks the calendar.
//!
//! Without an explicit `end_date`, the plan is as long as the reading load
//! needs: the planner keeps adding days until every book is finished. It stops
//! early only when reading has become impossible, detected as a full year with
//! no assigned reading after the last dated override (days off, kept
//! sessions, removed books). Past that date the calendar only repeats weekly,
//! so a year without progress means no later day can make progress either.

use chrono::NaiveDate;

use crate::native_planner::models::Settings;

/// Days without any assigned reading that prove the remaining load cannot be scheduled.
const STALL_DAYS: i64 = 366;

pub struct Horizon {
    cap: Option<NaiveDate>,
    last_override: NaiveDate,
    last_progress: NaiveDate,
}

impl Horizon {
    pub fn new(settings: &Settings) -> Self {
        Self {
            cap: settings.end_date,
            last_override: last_override_date(settings),
            last_progress: settings.start_date,
        }
    }

    /// Records a day on which at least one book received reading time.
    pub fn record_progress(&mut self, day: NaiveDate) {
        self.last_progress = day;
    }

    /// True while `day` may still produce reading for unfinished books.
    pub fn includes(&self, day: NaiveDate) -> bool {
        if self.cap.is_some_and(|cap| day > cap) {
            return false;
        }
        if day <= self.last_override {
            return true;
        }
        (day - self.last_progress).num_days() <= STALL_DAYS
    }
}

/// Latest date whose capacity or availability differs from the weekly pattern.
fn last_override_date(settings: &Settings) -> NaiveDate {
    settings
        .days_off
        .iter()
        .chain(settings.excluded_book_ids_by_date.keys())
        .chain(settings.reserved_book_ids_by_date.keys())
        .chain(settings.reserved_minutes_by_date.keys())
        .chain(settings.reserved_sessions_by_date.keys())
        .copied()
        .fold(settings.start_date, NaiveDate::max)
}
