use std::collections::{HashMap, HashSet};

use serde_json::{Map, Value};

use crate::native_planner::calendar::parse_date;
use crate::native_planner::coerce::{as_array, as_object, parse_i64_value};
use crate::native_planner::models::{ReservedBookIdsByDate, ReservedCountsByDate};

pub fn reserved_book_ids_by_date(
    data: &Map<String, Value>,
) -> Result<ReservedBookIdsByDate, String> {
    let Some(raw) = data.get("reserved_book_ids_by_date") else {
        return Ok(HashMap::new());
    };
    if raw.is_null() {
        return Ok(HashMap::new());
    }
    let entries = as_object(raw, "reserved_book_ids_by_date")?;
    let mut parsed = HashMap::new();
    for (date, value) in entries {
        parsed.insert(parse_date(date)?, string_set(value, date)?);
    }
    Ok(parsed)
}

pub fn reserved_minutes_by_date(data: &Map<String, Value>) -> Result<ReservedCountsByDate, String> {
    reserved_counts_by_date(data, "reserved_minutes_by_date")
}

pub fn reserved_sessions_by_date(
    data: &Map<String, Value>,
) -> Result<ReservedCountsByDate, String> {
    reserved_counts_by_date(data, "reserved_sessions_by_date")
}

fn reserved_counts_by_date(
    data: &Map<String, Value>,
    field: &str,
) -> Result<ReservedCountsByDate, String> {
    let Some(raw) = data.get(field) else {
        return Ok(HashMap::new());
    };
    if raw.is_null() {
        return Ok(HashMap::new());
    }
    let entries = as_object(raw, field)?;
    let mut parsed = HashMap::new();
    for (date, value) in entries {
        let count = nonnegative_count(value, field)?;
        parsed.insert(parse_date(date)?, count);
    }
    Ok(parsed)
}

fn string_set(value: &Value, date: &str) -> Result<HashSet<String>, String> {
    let items = as_array(value, "reserved_book_ids_by_date")?;
    let parsed = items
        .iter()
        .map(|item| reserved_book_id(item, date))
        .collect::<Result<Vec<_>, _>>()?;
    Ok(parsed
        .into_iter()
        .filter(|book_id| !book_id.is_empty())
        .collect())
}

fn nonnegative_count(value: &Value, field: &str) -> Result<i64, String> {
    let count = parse_i64_value(value, field)?;
    if count >= 0 {
        return Ok(count);
    }
    Err(format!("{field} values must be non-negative"))
}

fn reserved_book_id(value: &Value, date: &str) -> Result<String, String> {
    value
        .as_str()
        .map(str::trim)
        .map(str::to_string)
        .ok_or_else(|| format!("reserved_book_ids_by_date[{date}] must contain strings"))
}
