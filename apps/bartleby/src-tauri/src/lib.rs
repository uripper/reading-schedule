mod app_paths;
mod book_search;
mod commands;
mod cover_store;
mod data_archive;
mod kobo;
use bartleby_planner as native_planner;
mod plan_cache;
mod state_recover_cli;
mod state_store;
mod window_zoom;
mod workspace_commands;
mod workspace_model;
mod workspaces;

pub use native_planner::benchmark::run_planner_benchmark;
pub use state_recover_cli::recover_state_from_args;
pub use state_store::RecoverySummary;

#[cfg(test)]
mod data_archive_tests;
#[cfg(test)]
mod state_store_cover_tests;
#[cfg(test)]
mod state_store_tests;
#[cfg(test)]
mod workspace_migration_tests;
#[cfg(test)]
mod workspace_storage_tests;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
// Tauri expands this macro into generated support code we do not own.
#[allow(clippy::disallowed_macros, clippy::disallowed_types)]
pub fn run() {
    let context = tauri::generate_context!();
    tauri::Builder::default()
        .manage(plan_cache::PlanCacheState::default())
        .manage(window_zoom::ZoomState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(all(desktop, not(debug_assertions)))]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            window_zoom::initialize(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_data_export,
            commands::app_data_import,
            commands::books_search,
            commands::cover_download,
            commands::cover_import,
            commands::kobo_read_progress,
            commands::plan_generate,
            commands::plan_sample,
            commands::state_run_maintenance,
            commands::window_zoom_in,
            commands::window_zoom_out,
            commands::window_zoom_reset,
            workspace_commands::state_load,
            workspace_commands::state_save,
            workspace_commands::workspace_create,
            workspace_commands::workspace_delete,
            workspace_commands::workspace_list,
            workspace_commands::workspace_load,
            workspace_commands::workspace_load_all,
            workspace_commands::workspace_rename,
            workspace_commands::workspace_select,
            workspace_commands::workspace_set_archived,
            workspace_commands::workspace_set_session_completion,
            workspace_commands::workspace_snapshots,
            workspace_commands::workspace_transfer_books,
        ])
        .run(context)
        .expect("error while running tauri application");
}
