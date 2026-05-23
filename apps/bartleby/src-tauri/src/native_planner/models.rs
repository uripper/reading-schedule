use std::cmp::Ordering;
use std::collections::{BTreeSet, HashMap, HashSet};

use chrono::NaiveDate;

pub type Assignments = HashMap<(String, NaiveDate), i64>;
pub type CalendarMinutes = HashMap<NaiveDate, i64>;
pub type DifficultyMultiplier = HashMap<i64, f64>;
pub type MinutesByWeekday = HashMap<String, i64>;

pub const DEFAULT_DIFFICULTY: i64 = 1;
pub const DEFAULT_MIN_BLOCKS_PER_SESSION: i64 = 2;
pub const DEFAULT_PRIORITY: i64 = 3;
pub const DEFAULT_SOLVER_PROFILE: SolverProfile = SolverProfile::Fast;
pub const FEASIBLE_STATUS_NAME: &str = "FEASIBLE";
pub const INCOMPLETE_STATUS_NAME: &str = "INCOMPLETE";
pub const PLAN_MODE_FINISH_SOON: &str = "finish_soon";
pub const PLAN_MODE_SPREAD_OUT: &str = "spread_out";
pub const WEEKDAYS: [&str; 7] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SolverProfile {
    Fast,
}

#[derive(Clone, Debug)]
pub struct Book {
    pub blocked_by: Option<String>,
    pub book_id: String,
    pub deadline: Option<NaiveDate>,
    pub difficulty: i64,
    pub max_minutes_per_day: Option<i64>,
    pub min_blocks_per_session: i64,
    pub priority: i64,
    pub progress_percent: f64,
    pub remaining_words: i64,
    pub scheduled_days: BTreeSet<String>,
    pub title: String,
    pub words_total: Option<i64>,
}

#[derive(Clone, Debug)]
pub struct Settings {
    pub days_off: HashSet<NaiveDate>,
    pub difficulty_multiplier: DifficultyMultiplier,
    pub end_date: NaiveDate,
    pub max_blocks_per_book_per_day: i64,
    pub max_books_per_day: i64,
    pub max_sessions_per_day: i64,
    pub minutes_by_weekday: MinutesByWeekday,
    pub minutes_per_day: Option<i64>,
    pub plan_mode: String,
    pub solver_profile: SolverProfile,
    pub start_date: NaiveDate,
    pub time_quantum_minutes: i64,
    pub w_finish: f64,
    pub w_priority: f64,
    pub w_smooth: f64,
    pub w_switch: f64,
    pub wpm_base: i64,
}

#[derive(Debug)]
pub struct PlannerInput {
    pub books: Vec<Book>,
    pub settings: Settings,
}

#[derive(Debug)]
pub struct PlanResult {
    pub assignments: Assignments,
    pub deprecation_notice: Option<String>,
    pub note: String,
    pub objective: Option<i64>,
    pub planner: String,
    pub status: String,
}

pub fn default_difficulty_multiplier() -> DifficultyMultiplier {
    HashMap::from([
        (1, 1.0),
        (2, 0.9),
        (3, 0.8),
        (4, 0.7),
        (5, 0.6),
        (6, 0.5),
        (7, 0.4),
        (8, 0.3),
        (9, 0.2),
        (10, 0.1),
    ])
}

pub fn default_scheduled_days() -> BTreeSet<String> {
    WEEKDAYS.iter().map(|day| (*day).to_string()).collect()
}

/// Sorts lower numeric priority values before higher values.
pub fn priority_order(left: i64, right: i64) -> Ordering {
    left.cmp(&right)
}
