//! Validated command options and fixed workload settings for planner measurements.

use chrono::NaiveDate;

pub(super) const MAX_YEARS: u32 = 1000;
pub(super) const MAX_MINUTES_PER_DAY: i64 = 24 * 60;
/// App defaults: one-minute blocks and at most two books per day.
pub(super) const QUANTUM_MINUTES: i64 = 1;
pub(super) const BOOKS_PER_DAY: i64 = 2;
pub(super) const WORDS_PER_MINUTE: i64 = 250;
const DEFAULT_MINUTES_PER_DAY: i64 = 30;
/// Deadlines are spread over this many years when no --years cap is given.
const DEADLINE_YEARS: u32 = 10;
const FIRST_YEAR: i32 = 2026;
const DEFAULT_BOOKS: usize = 100;
const DEFAULT_SEED: u64 = 42;
const DEFAULT_SAMPLES: usize = 3;
const MAX_SAMPLES: usize = 1000;

pub(super) const HELP: &str = "\
Measure the Rust greedy reading planner using random books.

Usage: pnpm run bench:planner [options]

  --minutes-per-day N  Reading minutes every day, 1 to 1440 (default: 30, as in the app)
  --years N            Stop the plan after 1 to 1000 years (default: no limit; as in
                       the app, the plan runs until every book is finished)
  --seed N             Repeat the same random books (default: 42; zero is valid)
  --start-books N      First book count (default: 100)
  --samples N          Runs per count, 1 to 1000 (default: 3)
  --max-books N        Optional input limit for a shorter run
  --help               Show this help

Books double until one greedy run takes more than 10 seconds.
Extra counts narrow the measured one-second range to within 5%.
Generated data never touches your library.
";

/// Options that keep the benchmark finite in calendar size and reproducible.
#[derive(Clone, Debug)]
pub(super) struct Config {
    pub minutes_per_day: i64,
    pub years: Option<u32>,
    pub seed: u64,
    pub start_books: usize,
    pub samples: usize,
    pub max_books: Option<usize>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            minutes_per_day: DEFAULT_MINUTES_PER_DAY,
            years: None,
            seed: DEFAULT_SEED,
            start_books: DEFAULT_BOOKS,
            samples: DEFAULT_SAMPLES,
            max_books: None,
        }
    }
}

impl Config {
    /// Rejects unknown, missing and out-of-range options before doing any work.
    pub fn parse(args: &[String]) -> Result<Self, String> {
        let config = parse_options(args)?;
        validate(&config)?;
        Ok(config)
    }

    fn set_option(&mut self, flag: &str, value: &str) -> Result<(), String> {
        match flag {
            "--minutes-per-day" => self.minutes_per_day = number(flag, value)?,
            "--years" => self.years = Some(number(flag, value)?),
            "--seed" => self.seed = number(flag, value)?,
            "--start-books" => self.start_books = number(flag, value)?,
            "--samples" => self.samples = number(flag, value)?,
            "--max-books" => self.max_books = Some(number(flag, value)?),
            _ => return Err(format!("Unknown option {flag}. Use --help for options.")),
        }
        Ok(())
    }

    pub fn start_date(&self) -> NaiveDate {
        NaiveDate::from_ymd_opt(FIRST_YEAR, 1, 1).expect("fixed valid start date")
    }

    /// Optional cap; without one the planner sizes the plan from the reading load.
    pub fn end_date(&self) -> Option<NaiveDate> {
        self.years.map(last_day_after_years)
    }

    /// Last day that random deadlines may fall on.
    pub fn deadline_end(&self) -> NaiveDate {
        last_day_after_years(self.years.unwrap_or(DEADLINE_YEARS))
    }
}

fn last_day_after_years(years: u32) -> NaiveDate {
    let last_year = FIRST_YEAR + years as i32 - 1;
    NaiveDate::from_ymd_opt(last_year, 12, 31).expect("validated horizon has a valid end date")
}

/// Consumes flag/value pairs without silently accepting missing values.
fn parse_options(args: &[String]) -> Result<Config, String> {
    let mut config = Config::default();
    let mut arguments = args.iter();
    while let Some(flag) = arguments.next() {
        let value = arguments
            .next()
            .ok_or_else(|| format!("{flag} needs a number. Use --help for options."))?;
        config.set_option(flag, value)?;
    }
    Ok(config)
}

/// Keeps calendar size, repetition count and book-count limits meaningful.
fn validate(config: &Config) -> Result<(), String> {
    if config
        .years
        .is_some_and(|years| !(1..=MAX_YEARS).contains(&years))
    {
        return Err("--years must be from 1 to 1000.".to_string());
    }
    if !(1..=MAX_MINUTES_PER_DAY).contains(&config.minutes_per_day) {
        return Err("--minutes-per-day must be from 1 to 1440.".to_string());
    }
    if !(1..=MAX_SAMPLES).contains(&config.samples) {
        return Err("--samples must be from 1 to 1000.".to_string());
    }
    if config.start_books == 0 || config.max_books.is_some_and(|max| max < config.start_books) {
        return Err(
            "Book counts must be positive; --max-books must be >= --start-books.".to_string(),
        );
    }
    Ok(())
}

fn number<T: std::str::FromStr>(flag: &str, value: &str) -> Result<T, String> {
    value
        .parse()
        .map_err(|_| format!("{flag} needs a non-negative whole number; got {value}."))
}
