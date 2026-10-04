//! Plain-language tables and time bars for the terminal benchmark.

use std::io::{self, Write};
use std::time::Duration;

use super::config::{Config, MINUTES_PER_DAY, WORDS_PER_MINUTE};
use super::measure::{Measurement, STOP_TIME};
use super::search::Search;

const TABLE_WIDTH: usize = 108;
const BAR_WIDTH: usize = 20;
const DIGIT_GROUP: usize = 3;
const SECONDS_TO_MILLISECONDS: f64 = 1000.0;

/// Uses no terminal controls, so redirected output is readable too.
pub(super) fn header(writer: &mut impl Write, config: &Config) -> io::Result<()> {
    writeln!(writer, "\nBARTLEBY — GREEDY PLANNER BENCHMARK")?;
    writeln!(writer, "{}", "═".repeat(TABLE_WIDTH))?;
    writeln!(
        writer,
        "Plan: {} through {} ({} years)",
        config.start_date(),
        config.end_date(),
        config.years
    )?;
    writeln!(writer, "Reading: 24 hours every day ({MINUTES_PER_DAY} minutes); base speed: {WORDS_PER_MINUTE} words/minute")?;
    writeln!(
        writer,
        "Random seed: {} | Up to {} runs per count; times show the slowest run",
        config.seed, config.samples
    )?;
    writeln!(
        writer,
        "Assigned = books given reading time. Finished = books with all remaining words assigned."
    )?;
    writeln!(
        writer,
        "Whole plan = input parsing + greedy algorithm + report."
    )?;
    writeln!(
        writer,
        "Time bar: each # is 0.5 seconds of greedy time; a full bar is 10 seconds.\n"
    )?;
    table_header(writer)
}

pub(super) fn table_header(writer: &mut impl Write) -> io::Result<()> {
    writeln!(
        writer,
        "{:>12} {:>10} {:>10} {:>10} {:>4} {:>10} {:>11}  Greedy time",
        "Input books", "Assigned", "Finished", "Sessions", "Runs", "Greedy", "Whole plan"
    )?;
    writeln!(writer, "{}", "─".repeat(TABLE_WIDTH))
}

/// Flushes each result immediately so long runs show steady progress.
pub(super) fn row(writer: &mut impl Write, row: &Measurement) -> io::Result<()> {
    writeln!(
        writer,
        "{:>12} {:>10} {:>10} {:>10} {:>4} {:>9.3}s {:>10.3}s  {}",
        grouped(row.input_books),
        grouped(row.assigned_books),
        grouped(row.finished_books),
        grouped(row.sessions),
        row.samples,
        row.greedy_time.as_secs_f64(),
        row.total_time.as_secs_f64(),
        time_bar(row.greedy_time)
    )?;
    writer.flush()
}

/// Prints observed limits without claiming that every supplied book was assigned.
pub(super) fn summary(writer: &mut impl Write, search: &Search) -> io::Result<()> {
    writeln!(writer, "\n{}", "═".repeat(TABLE_WIDTH))?;
    let Some(best) = &search.best else {
        writeln!(
            writer,
            "No tested book count completed the greedy algorithm in under one second."
        )?;
        return Ok(());
    };
    writeln!(
        writer,
        "LARGEST TESTED INPUT UNDER ONE SECOND: {} books",
        grouped(best.input_books)
    )?;
    writeln!(
        writer,
        "{} books assigned | {} books finished | {} reading sessions",
        grouped(best.assigned_books),
        grouped(best.finished_books),
        grouped(best.sessions)
    )?;
    writeln!(
        writer,
        "Greedy: {:.3}s | Whole plan: {:.3}s",
        best.greedy_time.as_secs_f64(),
        best.total_time.as_secs_f64()
    )?;
    writeln!(
        writer,
        "Parsing: {:.3} ms | Report: {:.3} ms",
        milliseconds(best.parse_time),
        milliseconds(best.report_time)
    )?;
    if let Some(upper) = search.first_over_one {
        writeln!(
            writer,
            "Measured one-second range: {} to {} input books.",
            grouped(best.input_books),
            grouped(upper)
        )?;
    }
    writer.flush()
}

/// Caps bars at ten seconds without hiding the numeric duration beside them.
pub(super) fn time_bar(duration: Duration) -> String {
    let fraction = duration.as_secs_f64() / STOP_TIME.as_secs_f64();
    let filled = ((fraction * BAR_WIDTH as f64).ceil() as usize).min(BAR_WIDTH);
    format!("[{}{}]", "#".repeat(filled), "·".repeat(BAR_WIDTH - filled))
}

/// Adds digit separators without depending on the machine's locale.
pub(super) fn grouped(count: usize) -> String {
    let digits = count.to_string();
    digits
        .as_bytes()
        .rchunks(DIGIT_GROUP)
        .rev()
        .map(|group| std::str::from_utf8(group).expect("decimal digits are ASCII"))
        .collect::<Vec<_>>()
        .join(",")
}

fn milliseconds(duration: Duration) -> f64 {
    duration.as_secs_f64() * SECONDS_TO_MILLISECONDS
}
