/**
 * Electron main-process entry point and startup wiring.
 */
import path from "node:path";

import { app, BrowserWindow } from "electron";
import { downloadCover, saveUploadedCover } from "./main/book_lookup/index.ts";
import { searchBooks } from "./main/book_lookup/search.ts";
import { runBridge } from "./main/bridge.ts";
import { enableDevelopmentHotReload } from "./main/development-hot-reload.ts";
import { registerIpcHandlers } from "./main/ipc.ts";
import { readState, writeState } from "./main/state_store.ts";
import {
    initialZoomFactor,
    setZoomFactor,
    shiftZoomFactor,
} from "./main/zoom.ts";

/**
 * Creates and initializes the main application browser window.
 */
async function createWindow(): Promise<void> {
    const ICON_PATH = path.join(__dirname, "assets", "icon.ico");
    const WINDOW = new BrowserWindow({
        height: 1100,
        icon: ICON_PATH,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
        width: 1800,
    });
    setZoomFactor(WINDOW.webContents, initialZoomFactor());
    await WINDOW.loadFile(path.join(__dirname, "index.html"));
}

/**
 * Resolves the app-specific user data directory path.
 * @returns Absolute path for persisted app data.
 */
function userData(): string {
    return app.getPath("userData");
}

/**
 * Performs async startup tasks before opening the window.
 */
async function bootstrapApplication(): Promise<void> {
    await enableDevelopmentHotReload({
        importElectronReloader: () => import("electron-reloader"),
        isPackaged: app.isPackaged,
        targetModule: module,
    });
    await createWindow();
}

registerIpcHandlers({
    downloadCover,
    initialZoomFactor,
    readState,
    runBridge,
    saveUploadedCover,
    searchBooks,
    setZoomFactor,
    shiftZoomFactor,
    userData,
    writeState,
});

app.on("ready", () => {
    bootstrapApplication().catch(() => {
        app.exit(1);
    });
});
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
