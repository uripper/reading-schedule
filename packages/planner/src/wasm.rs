//! JSON boundary for the browser planner; domain validation stays in the core.

use wasm_bindgen::prelude::*;

/// Generates a schedule using exactly the same core as the desktop host.
#[wasm_bindgen]
pub fn generate_plan_json(payload_json: &str) -> Result<String, JsValue> {
    let payload = serde_json::from_str(payload_json)
        .map_err(|error| JsValue::from_str(&format!("Invalid planner JSON: {error}")))?;
    let result = crate::generate_plan(payload).map_err(|error| JsValue::from_str(&error))?;
    serde_json::to_string(&result)
        .map_err(|error| JsValue::from_str(&format!("Unable to serialize plan: {error}")))
}
