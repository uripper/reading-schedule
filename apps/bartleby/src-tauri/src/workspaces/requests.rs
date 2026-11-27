//! Renderer-facing request shapes for workspace operations, validated on arrival.
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use serde_json::Value;

const DAY_KEY_FORMAT: &str = "%Y-%m-%d";

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRequest {
    pub inherit_settings_from: Option<String>,
    pub name: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteRequest {
    pub today: String,
    pub transfer_books_to: Option<String>,
    pub workspace_id: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletionRequest {
    pub completed: bool,
    pub session_key: String,
    pub workspace_id: String,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DependencyPolicy {
    Reject,
    Remove,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ShelfPolicy {
    Clear,
    Keep,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferRequest {
    pub book_ids: Vec<String>,
    pub dependency_policy: DependencyPolicy,
    /// Original book records to restore after the move; set only by undo requests.
    #[serde(default)]
    pub restore_books: Option<Vec<Value>>,
    pub shelf_policy: ShelfPolicy,
    pub source_workspace_id: String,
    pub target_workspace_id: String,
    pub today: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRequest {
    pub expected_revision: Option<u64>,
    /// Revisions per workspace, sent by saves from the All Workspaces view.
    #[serde(default)]
    pub expected_revisions: Option<std::collections::HashMap<String, u64>>,
    pub state: Value,
    pub workspace_id: Option<String>,
}

/// Rejects anything but a `YYYY-MM-DD` local day key.
pub fn validate_day_key(day_key: &str) -> Result<(), String> {
    NaiveDate::parse_from_str(day_key, DAY_KEY_FORMAT)
        .map(|_| ())
        .map_err(|_| format!("Expected a YYYY-MM-DD day, received {day_key:?}."))
}
