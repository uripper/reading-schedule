use std::path::Path;

use serde_json::Value;

use crate::{state_store, workspace_model};

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub(super) struct ImportVerification {
    pub books_restored: usize,
    pub completion_entries_restored: usize,
    pub schedule_rows_restored: usize,
    pub sessions_restored: usize,
}

pub(super) fn verify_imported_state(state: &Value) -> Result<ImportVerification, String> {
    let snapshots = workspace_model::snapshots(state);
    if !snapshots
        .iter()
        .any(|snapshot| workspace_model::snapshot_has_bootstrap_shape(snapshot))
    {
        return Err("Imported planner state is missing books or settings.".to_string());
    }
    Ok(snapshots
        .into_iter()
        .map(snapshot_counts)
        .fold(ImportVerification::default(), ImportVerification::plus))
}

/// Counts the visible records of the workspace the renderer opens after import.
pub(super) fn active_workspace_counts(state: &Value) -> ImportVerification {
    let active_entry = workspace_model::active_workspace_id(state)
        .and_then(|id| workspace_model::find_workspace(state, id));
    let Some(active_entry) = active_entry else {
        return snapshot_counts(state);
    };
    snapshot_counts(&workspace_model::project_snapshot(state, active_entry))
}

fn snapshot_counts(state: &Value) -> ImportVerification {
    ImportVerification {
        books_restored: array_len(state, "books"),
        completion_entries_restored: object_len(state, "schedule_completions"),
        schedule_rows_restored: schedule_rows_restored(state),
        sessions_restored: array_len(state, "sessions"),
    }
}

impl ImportVerification {
    fn plus(self, other: Self) -> Self {
        Self {
            books_restored: self.books_restored + other.books_restored,
            completion_entries_restored: self.completion_entries_restored
                + other.completion_entries_restored,
            schedule_rows_restored: self.schedule_rows_restored + other.schedule_rows_restored,
            sessions_restored: self.sessions_restored + other.sessions_restored,
        }
    }
}

pub(super) fn verify_persisted_state(
    data_directory: &Path,
    expected: ImportVerification,
) -> Result<(), String> {
    let loaded_state = state_store::load_state_value_from_directory(data_directory);
    let actual = verify_imported_state(&loaded_state)?;
    if actual == expected {
        return Ok(());
    }
    Err(format!(
        "Post-import storage verification failed. Native import restored {}. Immediate storage load returned {}.",
        import_counts_summary(expected),
        import_counts_summary(actual)
    ))
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

fn import_counts_summary(counts: ImportVerification) -> String {
    format!(
        "{} books, {} schedule rows, {} sessions, {} completion entries",
        counts.books_restored,
        counts.schedule_rows_restored,
        counts.sessions_restored,
        counts.completion_entries_restored
    )
}
