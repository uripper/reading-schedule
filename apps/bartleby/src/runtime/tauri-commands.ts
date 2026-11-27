/**
 * Typed Tauri command names used by the Bartleby frontend adapter.
 */
export const TAURI_COMMANDS = {
    appDataExport: "app_data_export",
    appDataImport: "app_data_import",
    booksSearch: "books_search",
    coverDownload: "cover_download",
    coverImport: "cover_import",
    koboReadProgress: "kobo_read_progress",
    planGenerate: "plan_generate",
    planSample: "plan_sample",
    stateLoad: "state_load",
    stateRunMaintenance: "state_run_maintenance",
    stateSave: "state_save",
    windowZoomIn: "window_zoom_in",
    windowZoomOut: "window_zoom_out",
    windowZoomReset: "window_zoom_reset",

    workspaceCreate: "workspace_create",
    workspaceDelete: "workspace_delete",
    workspaceList: "workspace_list",
    workspaceLoad: "workspace_load",
    workspaceLoadAll: "workspace_load_all",
    workspaceRename: "workspace_rename",
    workspaceSelect: "workspace_select",
    workspaceSetArchived: "workspace_set_archived",
    workspaceSetSessionCompletion: "workspace_set_session_completion",
    workspaceSnapshots: "workspace_snapshots",
    workspaceTransferBooks: "workspace_transfer_books",
} as const;

export type TauriPlannerCommand =
    (typeof TAURI_COMMANDS)[keyof typeof TAURI_COMMANDS];
