/**
 * Typed Tauri command names used by the Bartleby frontend adapter.
 */
export const TAURI_COMMANDS = {
    booksSearch: "books_search",
    coverDownload: "cover_download",
    coverImport: "cover_import",
    coverNormalizeSavedState: "cover_normalize_saved_state",
    planGenerate: "plan_generate",
    planSample: "plan_sample",
    stateLoad: "state_load",
    stateSave: "state_save",
    windowZoomIn: "window_zoom_in",
    windowZoomOut: "window_zoom_out",
    windowZoomReset: "window_zoom_reset",
} as const;

export type TauriPlannerCommand =
    (typeof TAURI_COMMANDS)[keyof typeof TAURI_COMMANDS];
