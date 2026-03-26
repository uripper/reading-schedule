use std::path::Path;

use serde_json::{Map, Value};

pub const SOURCE_FRESH: &str = "fresh";
pub const SOURCE_JSON_BACKUP: &str = "json_backup";
pub const SOURCE_JSON_PRIMARY: &str = "json_primary";
pub const SOURCE_SQLITE: &str = "sqlite";
pub const SOURCE_SQLITE_JOURNAL_REPLAY: &str = "sqlite_journal_replay";

pub const WARNING_MIGRATED_JSON_TO_SQLITE: &str = "MIGRATED_JSON_TO_SQLITE";
pub const WARNING_MIGRATED_STATE_VERSION: &str = "MIGRATED_STATE_VERSION";
pub const WARNING_RECOVERED_FROM_BACKUP: &str = "RECOVERED_FROM_BACKUP";
pub const WARNING_RECOVERED_FROM_JOURNAL: &str = "RECOVERED_FROM_JOURNAL";
pub const WARNING_STATE_RESET_FRESH: &str = "STATE_RESET_FRESH";

#[derive(Clone, Debug)]
pub struct LoadResult {
    pub source: &'static str,
    pub source_path: String,
    pub state: Value,
    pub warning_code: Option<&'static str>,
    pub warning_message: Option<String>,
}

impl LoadResult {
    pub fn into_value(self) -> Value {
        let mut payload = Map::new();
        payload.insert("source".to_string(), Value::String(self.source.to_string()));
        payload.insert("sourcePath".to_string(), Value::String(self.source_path));
        payload.insert("state".to_string(), self.state);
        insert_optional_string(&mut payload, "warningCode", self.warning_code);
        insert_optional_string(
            &mut payload,
            "warningMessage",
            self.warning_message.as_deref(),
        );
        Value::Object(payload)
    }

    pub fn with_state(mut self, state: Value) -> Self {
        self.state = state;
        self
    }

    pub fn with_warning_message(mut self, warning_message: String) -> Self {
        self.warning_message = Some(warning_message);
        self
    }
}

pub fn path_string(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

fn insert_optional_string(payload: &mut Map<String, Value>, key: &str, value: Option<&str>) {
    let Some(value) = value else {
        return;
    };
    payload.insert(key.to_string(), Value::String(value.to_string()));
}
