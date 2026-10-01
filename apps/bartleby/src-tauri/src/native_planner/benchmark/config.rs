//! Validated command options and fixed workload settings for planner measurements.

use chrono::NaiveDate;

pub(super) const MAX_YEARS: u32 = 1000;
pub(super) const MINUTES_PER_DAY: i64 = 24 * 60;
pub(super) const QUANTUM_MINUTES: i64 = 15;
pub(super) const BLOCKS_PER_DAY: i64 = MINUTES_PER_DAY / QUANTUM_MINUTES;
pub(super) const WORDS_PER_MINUTE: i64 = 250;
const DEFAULT_YEARS: u32 = 10;
const FIRST_YEAR: i32 = 2026;
const DEFAULT_BOOKS: usize = 100;
const DEFAULT_SEED: u64 = 42;
const DEFAULT_SAMPLES: usize = 3;
const MAX_SAMPLES: usize = 1000;

pub(super) const HELP: &str = "\
Measure the Rust greedy reading planner using random books.

Usage: pnpm run bench:planner [options]

  --years N        Plan 1 to 1000 years (default: 10)
  --seed N         Repeat the same random books (default: 42; zero is valid)
  --start-books N  First book count (default: 100)
  --samples N      Runs per count, 1 to 1000 (default: 3)
  --max-books N    Optional input limit for a shorter run
  --help           Show this help

Books double until one greedy run takes more than 60 seconds.
Extra counts narrow the measured one-second range to within 5%.
Reading is available 24 hours every day. Generated data never touches your library.
";

/// Options that keep the benchmark finite in calendar size and reproducible.
#[derive(Clone, Debug)]
pub(super) struct Config {
    pub years: u32,
    pub seed: u64,
    pub start_books: usize,
    pub samples: usize,
    pub max_books: Option<usize>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            years: DEFAULT_YEARS,
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
            "--years" => self.years = number(flag, value)?,
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

    pub fn end_date(&self) -> NaiveDate {
        let last_year = FIRST_YEAR + self.years as i32 - 1;
        NaiveDate::from_ymd_opt(last_year, 12, 31).expect("validated horizon has a valid end date")
    }
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
    if !(1..=MAX_YEARS).contains(&config.years) {
        return Err("--years must be from 1 to 1000.".to_string());
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
