use serde_json::{Map, Value};

pub fn as_object<'a>(value: &'a Value, name: &str) -> Result<&'a Map<String, Value>, String> {
    value
        .as_object()
        .ok_or_else(|| format!("{name} must be a JSON object"))
}

pub fn as_array<'a>(value: &'a Value, name: &str) -> Result<&'a Vec<Value>, String> {
    value
        .as_array()
        .ok_or_else(|| format!("{name} must be a JSON array"))
}

pub fn parse_f64_value(value: &Value, field: &str) -> Result<f64, String> {
    if let Some(parsed) = value.as_f64() {
        return Ok(parsed);
    }
    if let Some(parsed) = value.as_i64() {
        return Ok(parsed as f64);
    }
    if let Some(parsed) = value.as_u64() {
        return Ok(parsed as f64);
    }
    if let Some(text) = value.as_str() {
        return text
            .trim()
            .parse::<f64>()
            .map_err(|_| format!("invalid number for {field}: {text}"));
    }
    Err(format!("invalid number for {field}: {value}"))
}

pub fn parse_i64_value(value: &Value, field: &str) -> Result<i64, String> {
    if let Some(parsed) = value.as_i64() {
        return Ok(parsed);
    }
    if let Some(parsed) = value.as_u64() {
        return i64::try_from(parsed).map_err(|_| format!("invalid integer for {field}: {parsed}"));
    }
    if let Some(parsed) = value.as_f64() {
        if parsed.is_finite() && parsed.fract() == 0.0 {
            return Ok(parsed as i64);
        }
    }
    if let Some(text) = value.as_str() {
        return text
            .trim()
            .parse::<i64>()
            .map_err(|_| format!("invalid integer for {field}: {text}"));
    }
    Err(format!("invalid integer for {field}: {value}"))
}

pub fn optional_i64_field(data: &Map<String, Value>, field: &str) -> Result<Option<i64>, String> {
    match data.get(field) {
        Some(Value::Null) | None => Ok(None),
        Some(value) => Ok(Some(parse_i64_value(value, field)?)),
    }
}

pub fn optional_string_field(
    data: &Map<String, Value>,
    field: &str,
) -> Result<Option<String>, String> {
    match data.get(field) {
        Some(Value::Null) | None => Ok(None),
        Some(Value::String(value)) => {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                return Ok(None);
            }
            Ok(Some(trimmed.to_string()))
        }
        Some(value) => Ok(Some(value.to_string().trim_matches('"').trim().to_string())),
    }
}

pub fn required_string_field(data: &Map<String, Value>, field: &str) -> Result<String, String> {
    let value = data
        .get(field)
        .ok_or_else(|| format!("{field} is required"))?;
    let text = value
        .as_str()
        .map(|item| item.trim().to_string())
        .unwrap_or_default();
    if text.is_empty() {
        return Err(format!("{field} is required"));
    }
    Ok(text)
}

pub fn string_list_or_csv_field(
    data: &Map<String, Value>,
    field: &str,
) -> Result<Option<Vec<String>>, String> {
    let Some(raw) = data.get(field) else {
        return Ok(None);
    };
    if raw.is_null() {
        return Ok(None);
    }
    if let Some(text) = raw.as_str() {
        let values = text
            .split(',')
            .map(|segment| segment.trim().to_string())
            .collect::<Vec<_>>();
        return Ok(Some(values));
    }
    let array = as_array(raw, field)?;
    Ok(Some(
        array
            .iter()
            .map(|item| item.as_str().unwrap_or("").trim().to_string())
            .collect(),
    ))
}
