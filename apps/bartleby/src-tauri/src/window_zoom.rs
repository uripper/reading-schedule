use std::env;
use std::sync::Mutex;

use tauri::{AppHandle, Manager, State, WebviewWindow};

const DEFAULT_UI_SCALE: f64 = 1.0;
const MIN_UI_SCALE: f64 = 0.7;
const MAX_UI_SCALE: f64 = 3.0;
const UI_SCALE_STEP: f64 = 0.1;
const ZOOM_PRECISION: f64 = 100.0;
const MAIN_WINDOW_LABEL: &str = "main";
const UI_SCALE_ENV_NAME: &str = "UI_SCALE";

const USER_SET_UI_SCALE_ENV_NAME: &str = "USER_SET_UI_SCALE";

pub struct ZoomState {
    current_factor: Mutex<f64>,
    initial_factor: f64,
}

impl Default for ZoomState {
    fn default() -> Self {
        let initial_factor = initial_zoom_factor();
        Self {
            current_factor: Mutex::new(initial_factor),
            initial_factor,
        }
    }
}

fn clamp_zoom_factor(value: f64) -> f64 {
    if !value.is_finite() {
        return DEFAULT_UI_SCALE;
    }
    value.clamp(MIN_UI_SCALE, MAX_UI_SCALE)
}

fn normalized_zoom_factor(value: f64) -> f64 {
    (clamp_zoom_factor(value) * ZOOM_PRECISION).round() / ZOOM_PRECISION
}

fn initial_zoom_factor() -> f64 {
    let requested_scale_raw = env::var(USER_SET_UI_SCALE_ENV_NAME)
        .ok()
        .unwrap_or_else(|| {
            env::var(UI_SCALE_ENV_NAME).unwrap_or_else(|_| DEFAULT_UI_SCALE.to_string())
        });
    let requested_scale = requested_scale_raw
        .trim()
        .parse::<f64>()
        .unwrap_or(DEFAULT_UI_SCALE);
    normalized_zoom_factor(requested_scale)
}

fn apply_zoom(window: &WebviewWindow, value: f64) -> Result<f64, String> {
    let next_factor = normalized_zoom_factor(value);
    window
        .set_zoom(next_factor)
        .map_err(|error| format!("Unable to update zoom level: {error}"))?;
    Ok(next_factor)
}

fn main_window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window(MAIN_WINDOW_LABEL)
        .or_else(|| app.webview_windows().into_values().next())
}

fn update_zoom(
    state: State<'_, ZoomState>,
    window: WebviewWindow,
    requested_factor: f64,
) -> Result<f64, String> {
    let applied_factor = apply_zoom(&window, requested_factor)?;
    let mut current_factor = state
        .current_factor
        .lock()
        .map_err(|_| "Unable to lock zoom state.".to_string())?;
    *current_factor = applied_factor;
    Ok(applied_factor)
}

pub fn initialize(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = main_window(app) {
        window.set_zoom(initial_zoom_factor())?;
    }
    Ok(())
}

pub fn zoom_in(state: State<'_, ZoomState>, window: WebviewWindow) -> Result<f64, String> {
    let current_factor = *state
        .current_factor
        .lock()
        .map_err(|_| "Unable to lock zoom state.".to_string())?;
    update_zoom(state, window, current_factor + UI_SCALE_STEP)
}

pub fn zoom_out(state: State<'_, ZoomState>, window: WebviewWindow) -> Result<f64, String> {
    let current_factor = *state
        .current_factor
        .lock()
        .map_err(|_| "Unable to lock zoom state.".to_string())?;
    update_zoom(state, window, current_factor - UI_SCALE_STEP)
}

pub fn zoom_reset(state: State<'_, ZoomState>, window: WebviewWindow) -> Result<f64, String> {
    let initial_factor = state.initial_factor;
    update_zoom(state, window, initial_factor)
}

#[cfg(test)]
mod tests {
    use super::{
        clamp_zoom_factor, normalized_zoom_factor, DEFAULT_UI_SCALE, MAX_UI_SCALE, MIN_UI_SCALE,
    };

    #[test]
    fn invalid_zoom_values_fall_back_to_default() {
        assert_eq!(clamp_zoom_factor(f64::NAN), DEFAULT_UI_SCALE);
    }

    #[test]
    fn zoom_values_are_clamped_and_rounded() {
        assert_eq!(normalized_zoom_factor(MAX_UI_SCALE + 1.0), MAX_UI_SCALE);
        assert_eq!(normalized_zoom_factor(MIN_UI_SCALE - 1.0), MIN_UI_SCALE);
        assert_eq!(normalized_zoom_factor(1.234), 1.23);
    }
}
