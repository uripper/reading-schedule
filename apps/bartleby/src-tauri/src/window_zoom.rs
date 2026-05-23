use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use crate::app_paths;
use tauri::{AppHandle, Manager, State, WebviewWindow};

const DEFAULT_UI_SCALE: f64 = 0.9;
const MIN_UI_SCALE: f64 = 0.7;
const MAX_UI_SCALE: f64 = 3.0;
const UI_SCALE_STEP: f64 = 0.1;
const ZOOM_PRECISION: f64 = 100.0;
const MAIN_WINDOW_LABEL: &str = "main";
const UI_SCALE_ENV_NAME: &str = "UI_SCALE";
const ZOOM_SETTINGS_FILE_NAME: &str = "window_zoom_factor.txt";

const USER_SET_UI_SCALE_ENV_NAME: &str = "USER_SET_UI_SCALE";

pub struct ZoomState {
    current_factor: Mutex<f64>,
    initial_factor: f64,
}

struct ZoomUpdateContext<'a> {
    app: &'a AppHandle,
    state: State<'a, ZoomState>,
    window: WebviewWindow,
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

fn initial_zoom_factor_from_values(user_set_scale: Option<&str>, ui_scale: Option<&str>) -> f64 {
    let requested_scale = user_set_scale
        .or(ui_scale)
        .and_then(|value| value.trim().parse::<f64>().ok())
        .unwrap_or(DEFAULT_UI_SCALE);
    normalized_zoom_factor(requested_scale)
}

fn initial_zoom_factor() -> f64 {
    let user_set_scale = env::var(USER_SET_UI_SCALE_ENV_NAME).ok();
    let ui_scale = env::var(UI_SCALE_ENV_NAME).ok();
    initial_zoom_factor_from_values(user_set_scale.as_deref(), ui_scale.as_deref())
}

fn zoom_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app_paths::canonical_data_directory(app)?.join(ZOOM_SETTINGS_FILE_NAME))
}

fn read_zoom_factor(path: &Path) -> Option<f64> {
    let contents = fs::read_to_string(path).ok()?;
    let parsed = contents.trim().parse::<f64>().ok()?;
    Some(normalized_zoom_factor(parsed))
}

fn persisted_or_initial_zoom_factor(path: &Path, initial_factor: f64) -> f64 {
    read_zoom_factor(path).unwrap_or(initial_factor)
}

fn write_zoom_factor(path: &Path, value: f64) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|error| format!("Unable to create zoom settings directory: {error}"))?;
    }
    fs::write(path, normalized_zoom_factor(value).to_string())
        .map_err(|error| format!("Unable to save zoom setting: {error}"))
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

fn update_zoom(context: ZoomUpdateContext<'_>, requested_factor: f64) -> Result<f64, String> {
    let applied_factor = apply_zoom(&context.window, requested_factor)?;
    write_zoom_factor(&zoom_settings_path(context.app)?, applied_factor)?;
    let mut current_factor = context
        .state
        .current_factor
        .lock()
        .map_err(|_| "Unable to lock zoom state.".to_string())?;
    *current_factor = applied_factor;
    Ok(applied_factor)
}

fn set_current_factor(app: &AppHandle, next_factor: f64) {
    let Some(state) = app.try_state::<ZoomState>() else {
        return;
    };
    let Ok(mut current_factor) = state.current_factor.lock() else {
        return;
    };
    *current_factor = next_factor;
}

pub fn initialize(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = main_window(app) {
        let initial_factor = initial_zoom_factor();
        let next_factor = zoom_settings_path(app)
            .map(|path| persisted_or_initial_zoom_factor(&path, initial_factor))
            .unwrap_or(initial_factor);
        set_current_factor(app, next_factor);
        window.set_zoom(next_factor)?;
    }
    Ok(())
}

pub fn zoom_in(
    app: AppHandle,
    state: State<'_, ZoomState>,
    window: WebviewWindow,
) -> Result<f64, String> {
    let current_factor = *state
        .current_factor
        .lock()
        .map_err(|_| "Unable to lock zoom state.".to_string())?;
    update_zoom(
        ZoomUpdateContext {
            app: &app,
            state,
            window,
        },
        current_factor + UI_SCALE_STEP,
    )
}

pub fn zoom_out(
    app: AppHandle,
    state: State<'_, ZoomState>,
    window: WebviewWindow,
) -> Result<f64, String> {
    let current_factor = *state
        .current_factor
        .lock()
        .map_err(|_| "Unable to lock zoom state.".to_string())?;
    update_zoom(
        ZoomUpdateContext {
            app: &app,
            state,
            window,
        },
        current_factor - UI_SCALE_STEP,
    )
}

pub fn zoom_reset(
    app: AppHandle,
    state: State<'_, ZoomState>,
    window: WebviewWindow,
) -> Result<f64, String> {
    let initial_factor = state.initial_factor;
    update_zoom(
        ZoomUpdateContext {
            app: &app,
            state,
            window,
        },
        initial_factor,
    )
}

#[cfg(test)]
mod tests {
    use super::{
        clamp_zoom_factor, initial_zoom_factor_from_values, normalized_zoom_factor,
        persisted_or_initial_zoom_factor, write_zoom_factor, DEFAULT_UI_SCALE, MAX_UI_SCALE,
        MIN_UI_SCALE,
    };
    use std::fs;
    use std::path::PathBuf;

    const TEST_ZOOM_FACTOR: f64 = 0.82;

    fn temp_zoom_directory(name: &str) -> PathBuf {
        let directory = std::env::temp_dir().join(format!(
            "bartleby-window-zoom-{name}-{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&directory);
        fs::create_dir_all(&directory).expect("expected temp zoom directory");
        directory
    }

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

    #[test]
    fn user_set_zoom_value_wins_over_default_ui_scale() {
        assert_eq!(
            initial_zoom_factor_from_values(Some("0.9"), Some("1.4")),
            0.9
        );
    }

    #[test]
    fn ui_scale_value_is_used_when_user_scale_is_missing() {
        assert_eq!(initial_zoom_factor_from_values(None, Some("1.1")), 1.1);
    }

    #[test]
    fn invalid_initial_zoom_values_fall_back_to_default() {
        assert_eq!(
            initial_zoom_factor_from_values(Some("nope"), Some("1.1")),
            DEFAULT_UI_SCALE,
        );
    }

    #[test]
    fn valid_persisted_zoom_value_wins_over_initial_scale() {
        let directory = temp_zoom_directory("read");
        let path = directory.join("zoom.txt");
        fs::write(&path, TEST_ZOOM_FACTOR.to_string()).expect("expected zoom write");

        assert_eq!(
            persisted_or_initial_zoom_factor(&path, 1.1),
            TEST_ZOOM_FACTOR
        );
        let _ = fs::remove_dir_all(&directory);
    }

    #[test]
    fn invalid_persisted_zoom_value_falls_back_to_initial_scale() {
        let directory = temp_zoom_directory("invalid");
        let path = directory.join("zoom.txt");
        fs::write(&path, "not a scale").expect("expected zoom write");

        assert_eq!(persisted_or_initial_zoom_factor(&path, 1.1), 1.1);
        let _ = fs::remove_dir_all(&directory);
    }

    #[test]
    fn write_zoom_factor_round_trips_normalized_scale() {
        let directory = temp_zoom_directory("write");
        let path = directory.join("zoom.txt");

        write_zoom_factor(&path, 1.234).expect("expected zoom setting write");

        assert_eq!(persisted_or_initial_zoom_factor(&path, 1.0), 1.23);
        let _ = fs::remove_dir_all(&directory);
    }
}
