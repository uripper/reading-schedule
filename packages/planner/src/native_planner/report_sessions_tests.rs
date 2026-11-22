//! Keeps the fast session date format identical to chrono's `%Y-%m-%d`.

use chrono::NaiveDate;

use super::report_sessions::day_key;

const SAMPLE_DATES: [(i32, u32, u32); 8] = [
    (0, 1, 1),
    (7, 3, 9),
    (999, 12, 31),
    (2026, 2, 28),
    (2400, 2, 29),
    (9999, 12, 31),
    (10000, 1, 1),
    (262_142, 12, 31),
];

#[test]
fn day_key_matches_chrono_format_for_short_and_long_years() {
    for (year, month, day) in SAMPLE_DATES {
        let date = NaiveDate::from_ymd_opt(year, month, day).expect("expected valid sample date");
        assert_eq!(day_key(date), date.format("%Y-%m-%d").to_string());
    }
}
