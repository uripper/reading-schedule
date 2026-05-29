use std::time::Instant;

use serde_json::{json, Value};

pub(crate) fn elapsed_ms(started_at: Instant) -> u128 {
    started_at.elapsed().as_millis()
}

pub(crate) fn set_summary_timing(output: &mut Value, key: &str, milliseconds: u128) {
    let Some(summary) = summary_object_mut(output) else {
        return;
    };
    let Some(timings) = summary
        .entry("timings_ms")
        .or_insert_with(|| json!({}))
        .as_object_mut()
    else {
        return;
    };
    timings.insert(key.to_string(), json!(milliseconds));
}

pub(crate) fn set_summary_timing_flag(output: &mut Value, key: &str, value: bool) {
    let Some(summary) = summary_object_mut(output) else {
        return;
    };
    let Some(timings) = summary
        .entry("timings_ms")
        .or_insert_with(|| json!({}))
        .as_object_mut()
    else {
        return;
    };
    timings.insert(key.to_string(), json!(value));
}

fn summary_object_mut(output: &mut Value) -> Option<&mut serde_json::Map<String, Value>> {
    output.get_mut("summary")?.as_object_mut()
}
