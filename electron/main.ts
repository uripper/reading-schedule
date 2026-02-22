/**
 * @file Electron main-process entry point and startup wiring.
 */
import path from "node:path";

import { app, BrowserWindow } from "electron";

import { downloadCover, saveUploadedCover, searchBooks } from "./book_lookup";
import { runBridge } from "./main_bridge";
import { registerIpcHandlers } from "./main_ipc";
import { initialZoomFactor, setZoomFactor, shiftZoomFactor } from "./main_zoom";
import { readState, writeState } from "./state_store";
import { findInPage, stopFindInPage } from "./window_find";

/**
 * Creates and initializes the main application browser window.
 */
function createWindow(): void {
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
  window.loadFile(path.join(__dirname, "index.html"));
}

/**
 * Resolves the app-specific user data directory path.
 * @returns Absolute path for persisted app data.
 */
function userData(): string {
  return app.getPath("userData");
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
  findInPage,
  stopFindInPage: async (webContents) => stopFindInPage(webContents),
});

app.on("ready", createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
