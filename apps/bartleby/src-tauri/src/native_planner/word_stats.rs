use serde_json::{Map, Value};

use crate::native_planner::coerce::{optional_i64_field, parse_f64_value};

const MAX_PROGRESS_PERCENT: f64 = 100.0;
const MIN_PROGRESS_PERCENT: f64 = 0.0;
const WORDS_PER_PAGE: i64 = 300;

#[derive(Debug)]
pub struct WordStats {
    pub progress_percent: f64,
    pub remaining_words: i64,
    pub words_total: i64,
}

struct WordResolution<'a> {
    data: &'a Map<String, Value>,
    pages_total: Option<i64>,
    words_total: i64,
}

pub fn word_stats_from_data(data: &Map<String, Value>) -> Result<WordStats, String> {
    let remaining_words = optional_i64_field(data, "remaining_words")?;
    let pages_total = optional_i64_field(data, "pages_total")?;
    let words_total = resolved_words_total(data, remaining_words, pages_total)?;
    let remaining_words = WordResolution {
        data,
        pages_total,
        words_total,
    }
    .resolved_remaining_words(remaining_words)?;
    Ok(WordStats {
        progress_percent: progress_percent(words_total, remaining_words),
        remaining_words,
        words_total,
    })
}

fn resolved_words_total(
    data: &Map<String, Value>,
    remaining_words: Option<i64>,
    pages_total: Option<i64>,
) -> Result<i64, String> {
    if let Some(words_total) = optional_i64_field(data, "words_total")? {
        return require_positive_int(words_total, "words_total");
    }
    if let Some(pages_total) = pages_total.filter(|_| remaining_words.is_none()) {
        return require_positive_int(pages_total, "pages_total");
    }
    let Some(remaining_words) = remaining_words else {
        return Err("book requires remaining_words, words_total, or pages_total".to_string());
    };
    derived_total_words(data, remaining_words, pages_total)
}

fn derived_total_words(
    data: &Map<String, Value>,
    remaining_words: i64,
    pages_total: Option<i64>,
) -> Result<i64, String> {
    let base_remaining = require_non_negative_int(remaining_words, "remaining_words")?;
    if let Some(words_read) = optional_i64_field(data, "words_read")? {
        return Ok(base_remaining + words_read.max(0));
    }
    if let Some(pages_read) = optional_i64_field(data, "pages_read")? {
        return derived_total_from_pages(base_remaining, pages_read, pages_total);
    }
    derived_total_from_progress(data, base_remaining)
}

fn derived_total_from_pages(
    remaining_words: i64,
    pages_read: i64,
    pages_total: Option<i64>,
) -> Result<i64, String> {
    let bounded_pages = pages_read.max(0);
    let Some(pages_total) = pages_total else {
        return Ok(remaining_words + bounded_pages * WORDS_PER_PAGE);
    };
    if pages_total <= 0 {
        return Ok(remaining_words + bounded_pages * WORDS_PER_PAGE);
    }
    if bounded_pages >= pages_total {
        return Err(
            "pages_read must be less than pages_total when remaining_words is provided".to_string(),
        );
    }
    let remaining_pages = pages_total - bounded_pages;
    let derived_total =
        (remaining_words as f64 * pages_total as f64 / remaining_pages as f64).round() as i64;
    Ok(remaining_words.max(derived_total))
}

fn derived_total_from_progress(
    data: &Map<String, Value>,
    remaining_words: i64,
) -> Result<i64, String> {
    let progress_percent = raw_progress_percent(data)?;
    if progress_percent <= MIN_PROGRESS_PERCENT {
        return Ok(remaining_words);
    }
    if progress_percent >= MAX_PROGRESS_PERCENT {
        return Err(
            "progress_percent must be less than 100 when remaining_words is provided".to_string(),
        );
    }
    let derived_total = (remaining_words as f64 * MAX_PROGRESS_PERCENT
        / (MAX_PROGRESS_PERCENT - progress_percent))
        .round() as i64;
    Ok(remaining_words.max(derived_total))
}

fn estimated_words_read_from_pages(
    pages_read: i64,
    words_total: i64,
    pages_total: Option<i64>,
) -> i64 {
    let bounded_pages = pages_read.max(0);
    let Some(pages_total) = pages_total else {
        return bounded_pages * WORDS_PER_PAGE;
    };
    if pages_total <= 0 {
        return bounded_pages * WORDS_PER_PAGE;
    }
    let clamped_pages = bounded_pages.min(pages_total);
    (words_total as f64 * clamped_pages as f64 / pages_total as f64).round() as i64
}

fn progress_percent(words_total: i64, remaining_words: i64) -> f64 {
    if words_total <= 0 {
        return 0.0;
    }
    let words_read = (words_total - remaining_words).max(0);
    ((MAX_PROGRESS_PERCENT * words_read as f64 / words_total as f64) * 100.0).round() / 100.0
}

fn raw_progress_percent(data: &Map<String, Value>) -> Result<f64, String> {
    let progress_percent = match data.get("progress_percent") {
        Some(value) => parse_f64_value(value, "progress_percent")?,
        None => 0.0,
    };
    if !(MIN_PROGRESS_PERCENT..=MAX_PROGRESS_PERCENT).contains(&progress_percent) {
        return Err("progress_percent must be between 0 and 100".to_string());
    }
    Ok(progress_percent)
}

fn bounded_words_read(words_read: i64, words_total: i64) -> i64 {
    words_read.max(0).min(words_total)
}

fn require_non_negative_int(value: i64, field: &str) -> Result<i64, String> {
    if value < 0 {
        return Err(format!("{field} must be >= 0"));
    }
    Ok(value)
}

fn require_positive_int(value: i64, field: &str) -> Result<i64, String> {
    if value <= 0 {
        return Err(format!("{field} must be > 0"));
    }
    Ok(value)
}

impl<'a> WordResolution<'a> {
    fn resolved_remaining_words(&self, remaining_words: Option<i64>) -> Result<i64, String> {
        match remaining_words {
            Some(remaining_words) => require_non_negative_int(remaining_words, "remaining_words"),
            None => self.derived_remaining_words(),
        }
    }

    fn resolved_words_read(&self) -> Result<i64, String> {
        match optional_i64_field(self.data, "words_read")? {
            Some(words_read) => Ok(bounded_words_read(words_read, self.words_total)),
            None => self.resolved_words_read_without_words_read(),
        }
    }

    fn derived_remaining_words(&self) -> Result<i64, String> {
        let words_read = self.resolved_words_read()?;
        Ok((self.words_total - words_read).max(0))
    }

    fn resolved_words_read_without_words_read(&self) -> Result<i64, String> {
        match optional_i64_field(self.data, "pages_read")? {
            Some(pages_read) => Ok(bounded_words_read(
                estimated_words_read_from_pages(pages_read, self.words_total, self.pages_total),
                self.words_total,
            )),
            None => self.derived_words_read_from_progress(),
        }
    }

    fn derived_words_read_from_progress(&self) -> Result<i64, String> {
        let progress_percent = raw_progress_percent(self.data)?;
        let derived_words_read =
            (self.words_total as f64 * progress_percent / MAX_PROGRESS_PERCENT).round() as i64;
        Ok(bounded_words_read(derived_words_read, self.words_total))
    }
}
