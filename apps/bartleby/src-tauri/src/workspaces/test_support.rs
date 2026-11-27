//! Shared fixtures for workspace operation tests: temporary data directories, planner
//! snapshots, and readers for the persisted application envelope.
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

use serde_json::{json, Value};
use uuid::Uuid;

use super::requests::{DependencyPolicy, ShelfPolicy};
use super::{
    create, load, load_all, save_snapshot, select, CreateRequest, SaveRequest, TransferRequest,
    WorkspaceLoad,
};
use crate::state_store;
use crate::workspace_model::{self, DEFAULT_WORKSPACE_ID, KEY_SNAPSHOT};

pub const PAST_DAY: &str = "2026-06-09";
pub const TODAY: &str = "2026-06-10";
pub const FUTURE_DAY: &str = "2026-06-11";
pub const LATER_DAY: &str = "2026-06-12";
pub const DAILY_GOAL_MINUTES: i64 = 45;
pub const BOOK_PRIORITY: i64 = 2;
pub const BOOK_PROGRESS_PERCENT: f64 = 37.5;
pub const SECOND_WORKSPACE_NAME: &str = "Book Club";

/// Data directory removed when the test finishes, pass or fail.
pub struct TestDirectory {
    pub path: PathBuf,
}

impl TestDirectory {
    pub fn new(name: &str) -> Self {
        let path = env::temp_dir().join(format!("bartleby-workspaces-{name}-{}", Uuid::new_v4()));
        Self { path }
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

pub fn book(book_id: &str, title: &str) -> Value {
    json!({
        "blocked_by": null,
        "book_id": book_id,
        "collections": ["Favorites"],
        "cover_local_path": format!("/covers/{book_id}.jpg"),
        "deadline": "2026-07-01",
        "priority": BOOK_PRIORITY,
        "progress_percent": BOOK_PROGRESS_PERCENT,
        "shelf": "Nightstand",
        "status": "in_progress",
        "title": title,
    })
}

/// Version 1 planner snapshot as the renderer sends it.
pub fn planner_snapshot(books: Vec<Value>) -> Value {
    json!({
        "blocked_day_books": {},
        "books": books,
        "last_result": null,
        "preferences": { "dailyGoalMinutes": DAILY_GOAL_MINUTES, "theme": "dark" },
        "schedule_completions": {},
        "sessions": [],
        "settings": { "start_date": PAST_DAY },
        "state_version": 1,
    })
}

pub fn save_request(workspace_id: Option<&str>, snapshot: Value) -> SaveRequest {
    SaveRequest {
        expected_revision: None,
        expected_revisions: None,
        state: snapshot,
        workspace_id: workspace_id.map(str::to_string),
    }
}

/// Seeds the default workspace through the first-save path.
pub fn seed_default(directory: &Path, snapshot: Value) {
    save_snapshot(directory, &save_request(None, snapshot)).expect("expected first save");
}

pub fn create_named(directory: &Path, name: &str) -> String {
    let request = CreateRequest {
        inherit_settings_from: None,
        name: name.to_string(),
    };
    create(directory, &request, &json!({}))
        .expect("expected workspace creation")
        .workspace_id
}

/// Seeds the default workspace and a second workspace holding `target_snapshot`.
pub fn seed_two(directory: &Path, source_snapshot: Value, target_snapshot: Value) -> String {
    seed_default(directory, source_snapshot);
    let target_id = create_named(directory, SECOND_WORKSPACE_NAME);
    save_snapshot(directory, &save_request(Some(&target_id), target_snapshot))
        .expect("expected second workspace save");
    target_id
}

pub fn stored_state(directory: &Path) -> Value {
    state_store::load_state_value_from_directory(directory)
}

pub fn stored_entry(directory: &Path, workspace_id: &str) -> Value {
    workspace_model::find_workspace(&stored_state(directory), workspace_id)
        .cloned()
        .expect("expected stored workspace")
}

pub fn stored_snapshot(directory: &Path, workspace_id: &str) -> Value {
    stored_entry(directory, workspace_id)[KEY_SNAPSHOT].clone()
}

pub fn stored_revision(directory: &Path, workspace_id: &str) -> u64 {
    workspace_model::revision(&stored_entry(directory, workspace_id))
}

pub fn stored_needs_replan(directory: &Path, workspace_id: &str) -> bool {
    workspace_model::needs_replan(&stored_entry(directory, workspace_id))
}

pub fn stored_book(directory: &Path, workspace_id: &str, book_id: &str) -> Option<Value> {
    stored_snapshot(directory, workspace_id)["books"]
        .as_array()?
        .iter()
        .find(|book| book["book_id"] == book_id)
        .cloned()
}

/// Moves `book_ids` from the default workspace, rejecting dependency conflicts.
pub fn transfer_request(target_id: &str, book_ids: &[&str]) -> TransferRequest {
    TransferRequest {
        book_ids: book_ids.iter().map(|id| (*id).to_string()).collect(),
        dependency_policy: DependencyPolicy::Reject,
        restore_books: None,
        shelf_policy: ShelfPolicy::Keep,
        source_workspace_id: DEFAULT_WORKSPACE_ID.to_string(),
        target_workspace_id: target_id.to_string(),
        today: TODAY.to_string(),
    }
}

/// Returns the active workspace's merged planner snapshot, or a version 1 state itself.
pub fn active_snapshot(state: &Value) -> Value {
    if !workspace_model::is_app_state(state) {
        return state.clone();
    }
    let active_id = workspace_model::active_workspace_id(state).unwrap_or(DEFAULT_WORKSPACE_ID);
    workspace_model::find_workspace(state, active_id)
        .map(|entry| workspace_model::project_snapshot(state, entry))
        .unwrap_or_default()
}

/// Opens a workspace the way the renderer does: record the selection, then read it.
pub fn activate(directory: &Path, workspace_id: &str) -> Result<WorkspaceLoad, String> {
    select(directory, workspace_id)?;
    load(directory, workspace_id)
}

/// Opens the All Workspaces view the way the renderer does.
pub fn activate_all(directory: &Path) -> Result<WorkspaceLoad, String> {
    select(directory, workspace_model::ALL_WORKSPACES_ID)?;
    load_all(directory)
}
