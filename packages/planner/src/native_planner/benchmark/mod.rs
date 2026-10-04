//! Reproducible terminal benchmark using the same greedy planner as the desktop app.

mod config;
mod data;
mod measure;
mod output;
mod random;
mod search;
#[cfg(test)]
mod tests;

use std::io::{self, Write};

use config::{Config, HELP};
use measure::{measure, warm_up, STOP_TIME};
use search::{next_count, Search};

/// Runs synthetic plans entirely in memory and prints completed measurements.
pub fn run_planner_benchmark(args: &[String]) -> Result<(), String> {
    let mut writer = io::stdout().lock();
    if args.iter().any(|argument| argument == "--help") {
        return writer.write_all(HELP.as_bytes()).map_err(output_error);
    }
    if cfg!(debug_assertions) {
        return Err("Run the benchmark with --release, or use pnpm run bench:planner.".to_string());
    }
    run(&Config::parse(args)?, &mut writer)
}

/// Warms up, measures growth, refines the one-second range and prints the result.
fn run(config: &Config, writer: &mut impl Write) -> Result<(), String> {
    output::header(writer, config).map_err(output_error)?;
    writer.flush().map_err(output_error)?;
    warm_up(config)?;
    let mut search = Search::default();
    grow(config, writer, &mut search)?;
    refine(config, writer, &mut search)?;
    output::summary(writer, &search).map_err(output_error)
}

/// Doubles the input, waiting for each complete plan rather than cutting it short.
fn grow(config: &Config, writer: &mut impl Write, search: &mut Search) -> Result<(), String> {
    let mut next = Some(config.start_books);
    while let Some(count) = next {
        let row = measure(config, count)?;
        output::row(writer, &row).map_err(output_error)?;
        search.record(&row);
        next = following_count(config, &row, writer)?;
    }
    Ok(())
}

/// Reports whether elapsed greedy time or a requested input cap stopped growth.
fn following_count(
    config: &Config,
    row: &measure::Measurement,
    writer: &mut impl Write,
) -> Result<Option<usize>, String> {
    let count = row.input_books;
    if row.greedy_time > STOP_TIME {
        writeln!(writer, "\nStopped increasing: {count} input books took more than 10 seconds in the greedy algorithm.").map_err(output_error)?;
        return Ok(None);
    }
    let next = next_count(config, count)?;
    if next.is_none() {
        writeln!(
            writer,
            "\nStopped at --max-books {count}; the greedy algorithm did not exceed 10 seconds."
        )
        .map_err(output_error)?;
    }
    Ok(next)
}

/// Adds actual measurements near one second instead of estimating from throughput.
fn refine(config: &Config, writer: &mut impl Write, search: &mut Search) -> Result<(), String> {
    if search.refinement_count().is_none() {
        return Ok(());
    }
    writeln!(writer, "\nChecking more book counts near one second...").map_err(output_error)?;
    output::table_header(writer).map_err(output_error)?;
    while let Some(count) = search.refinement_count() {
        let row = measure(config, count)?;
        output::row(writer, &row).map_err(output_error)?;
        search.record(&row);
    }
    Ok(())
}

fn output_error(error: io::Error) -> String {
    format!("Unable to write the benchmark report: {error}")
}
