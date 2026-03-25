mod app_paths;
mod book_search;
mod commands;
mod cover_store;
mod native_planner;
mod state_recover_cli;
mod state_store;
mod window_zoom;

pub use state_recover_cli::recover_state_from_args;
pub use state_store::RecoverySummary;

#[cfg(test)]
mod state_store_tests;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let context = tauri::generate_context!();
    tauri::Builder::default()
        .manage(window_zoom::ZoomState::default())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            window_zoom::initialize(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::books_search,
            commands::cover_download,
            commands::cover_import,
            commands::plan_generate,
            commands::plan_sample,
            commands::state_load,
            commands::state_save,
            commands::window_zoom_in,
            commands::window_zoom_out,
            commands::window_zoom_reset,
        ])
        .run(context)
        .expect("error while running tauri application");
}
