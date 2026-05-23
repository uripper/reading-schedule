use serde_json::Value;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) struct ImportVerification {
    pub books_restored: usize,
    pub completion_entries_restored: usize,
    pub schedule_rows_restored: usize,
    pub sessions_restored: usize,
}

pub(super) fn verify_imported_state(state: &Value) -> Result<ImportVerification, String> {
    if !state_has_bootstrap_shape(state) {
        return Err("Imported planner state is missing books or settings.".to_string());
    }
    Ok(ImportVerification {
        books_restored: array_len(state, "books"),
        completion_entries_restored: object_len(state, "schedule_completions"),
        schedule_rows_restored: schedule_rows_restored(state),
        sessions_restored: array_len(state, "sessions"),
    })
}

fn state_has_bootstrap_shape(state: &Value) -> bool {
    let Some(state_object) = state.as_object() else {
        return false;
    };
    state_object.contains_key("books") && state_object.contains_key("settings")
}

fn array_len(state: &Value, key: &str) -> usize {
    state.get(key).and_then(Value::as_array).map_or(0, Vec::len)
}

fn object_len(state: &Value, key: &str) -> usize {
    state
        .get(key)
        .and_then(Value::as_object)
        .map_or(0, serde_json::Map::len)
}

fn schedule_rows_restored(state: &Value) -> usize {
    state
        .get("last_result")
        .or_else(|| state.get("lastResult"))
        .and_then(|result| result.get("schedule"))
        .and_then(Value::as_array)
        .map_or(0, Vec::len)
}
