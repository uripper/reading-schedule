//! Book-count growth and measured one-second range tracking.

use super::config::Config;
use super::measure::{Measurement, ONE_SECOND};

const GROWTH_FACTOR: usize = 2;
const RANGE_PERCENT: usize = 5;
const PERCENT_SCALE: usize = 100;

/// Tracks observed counts; timing noise means this is not an exact capacity claim.
#[derive(Default)]
pub(super) struct Search {
    pub best: Option<Measurement>,
    pub first_over_one: Option<usize>,
}

impl Search {
    pub fn record(&mut self, row: &Measurement) {
        record_measurement(self, row);
    }

    /// Bisects only between measured counts and stops at a 5% or one-book gap.
    pub fn refinement_count(&self) -> Option<usize> {
        refinement_count(self)
    }
}

/// Retains the largest observed passing input and smallest observed failing input.
fn record_measurement(search: &mut Search, row: &Measurement) {
    if row.greedy_time >= ONE_SECOND {
        let previous = search.first_over_one.unwrap_or(usize::MAX);
        search.first_over_one = Some(previous.min(row.input_books));
        return;
    }
    let previous = search
        .best
        .as_ref()
        .map(|best| best.input_books)
        .unwrap_or(0);
    if row.input_books > previous {
        search.best = Some(row.clone());
    }
}

/// Picks an untested interior count, even when the first run already exceeds a second.
fn refinement_count(search: &Search) -> Option<usize> {
    let upper = search.first_over_one?;
    let lower = search
        .best
        .as_ref()
        .map(|best| best.input_books)
        .unwrap_or(0);
    let tolerance = (lower / PERCENT_SCALE * RANGE_PERCENT).max(1);
    let gap = upper.saturating_sub(lower);
    if gap <= tolerance {
        return None;
    }
    Some(lower + gap / GROWTH_FACTOR)
}

/// Respects an optional user limit and catches count overflow before allocation.
pub(super) fn next_count(config: &Config, count: usize) -> Result<Option<usize>, String> {
    if config.max_books == Some(count) {
        return Ok(None);
    }
    let doubled = count.checked_mul(GROWTH_FACTOR).ok_or_else(|| {
        "Book count is too large to double. Use --max-books to set a limit.".to_string()
    })?;
    let next = doubled.min(config.max_books.unwrap_or(usize::MAX));
    Ok(Some(next))
}
