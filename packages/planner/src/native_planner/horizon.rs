//! Decides how far the greedy planner walks the calendar.
//!
//! Without an explicit `end_date`, the plan is as long as the reading load
//! needs: the planner keeps adding days until every book is finished. It stops
//! early only when reading has become impossible, detected as a full year of
//! ordinary days with no assigned reading since the last day that had some.
//!
//! An ordinary day is one without a dated override (day off, removed book,
//! kept session or reserved time). The planner's state changes only on days
//! with reading, and on an ordinary day whether reading happens then depends
//! only on that state and the weekday. Every override only takes availability
//! away from the weekly pattern, so a day that is not ordinary can never read
//! when the ordinary days of its weekday cannot. Once a stall covers every
//! weekday on ordinary days, no later day can make progress, however far away
//! the last override is. Overridden days do not count toward the stall, so a
//! long run of days off (a multi-year break) still plans the reading after it.
//!
//! A load that keeps making progress is still bounded by a safety ceiling far
//! beyond any real reading list, so an absurd word count (bad or crafted data)
//! ends as an incomplete plan instead of exhausting memory.

use std::collections::HashSet;

use chrono::NaiveDate;

use crate::native_planner::models::Settings;

/// Ordinary days without any assigned reading that prove the remaining load
/// cannot be scheduled. Any count covering every weekday is enough; a year is
/// a generous margin.
const STALL_DAYS: i64 = 366;
/// Most days an open-ended plan may walk: five centuries, longer than any reader needs.
const MAX_PLAN_DAYS: i64 = 182_625;

pub struct Horizon {
    cap: Option<NaiveDate>,
    override_days: HashSet<NaiveDate>,
    stalled_days: i64,
    walked_days: i64,
}

impl Horizon {
    pub fn new(settings: &Settings) -> Self {
        Self {
            cap: settings.end_date,
            override_days: override_days(settings),
            stalled_days: 0,
            walked_days: 0,
        }
    }

    /// Records the outcome of a planned day; `progressed` means a book received reading time.
    pub fn record_day(&mut self, day: NaiveDate, progressed: bool) {
        self.walked_days += 1;
        if progressed {
            self.stalled_days = 0;
            return;
        }
        if !self.override_days.contains(&day) {
            self.stalled_days += 1;
        }
    }

    /// True while `day` may still produce reading for unfinished books.
    pub fn includes(&self, day: NaiveDate) -> bool {
        if self.cap.is_some_and(|cap| day > cap) {
            return false;
        }
        self.stalled_days < STALL_DAYS && self.walked_days < MAX_PLAN_DAYS
    }
}

/// Dates whose capacity or availability differs from the weekly pattern.
fn override_days(settings: &Settings) -> HashSet<NaiveDate> {
    settings
        .days_off
        .iter()
        .chain(settings.excluded_book_ids_by_date.keys())
        .chain(settings.reserved_book_ids_by_date.keys())
        .chain(settings.reserved_minutes_by_date.keys())
        .chain(settings.reserved_sessions_by_date.keys())
        .copied()
        .collect()
}
