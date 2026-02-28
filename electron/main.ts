/**
 * @file Electron main-process entry point and startup wiring.
 */
import path from "node:path";

import { app, BrowserWindow } from "electron";

import {
    downloadCover,
    saveUploadedCover,
    searchBooks,
} from "./main/book_lookup";
import { runBridge } from "./main/bridge";
import { registerIpcHandlers } from "./main/ipc";
import { readState, writeState } from "./main/state_store";
import { initialZoomFactor, setZoomFactor, shiftZoomFactor } from "./main/zoom";

const DEVELOPMENT_ENVIRONMENT = "development";
const HOT_RELOAD_IGNORED_OUTPUTS = ["dist/main.js", "dist/main/**"];

/**
 * Enables main-process hot reload during development.
 */
async function enableDevelopmentHotReload(): Promise<void> {
    if (process.env.NODE_ENV !== DEVELOPMENT_ENVIRONMENT) {
        return;
    }
    const reloaderModule = await import("electron-reloader");
    reloaderModule.default(module, {
        ignore: HOT_RELOAD_IGNORED_OUTPUTS,
        watchRenderer: true,
    });
}

/**
 * Creates and initializes the main application browser window.
 */
async function createWindow(): Promise<void> {
    const iconPath = path.join(__dirname, "assets", "logo.png");
    const window = new BrowserWindow({
        width: 1800,
        height: 1100,
        icon: iconPath,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
    });
    setZoomFactor(window.webContents, initialZoomFactor());
    await window.loadFile(path.join(__dirname, "index.html"));
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
    await enableDevelopmentHotReload();
    await createWindow();
}

registerIpcHandlers({
    runBridge,
    searchBooks,
    downloadCover,
    saveUploadedCover,
    readState,
    writeState,
    userData,
    shiftZoomFactor,
    setZoomFactor,
    initialZoomFactor,
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
