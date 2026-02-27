/**
 * @file Main-process IPC registration for planner and window actions.
 */
import { ipcMain } from "electron";
import type { JsonValue } from "../types/types_json";
import { UI_SCALE_STEP } from "./zoom";
import { asDownloadCoverPayload, asUploadCoverPayload, type DownloadCoverPayload, type UploadCoverPayload } from "./ipc_payloads";
import type { RegisterIpcHandlersArgs } from "../types/main/ipc.js";

/**
 * Registers all main-process IPC handlers consumed by the renderer.
 * @param root0 IPC dependency implementations.
 * @param root0.downloadCover Fetches and stores a remote cover image.
 * @param root0.initialZoomFactor Returns the configured initial zoom factor.
 * @param root0.readState Loads persisted renderer state from disk.
 * @param root0.runBridge Invokes the planner bridge command.
 * @param root0.saveUploadedCover Persists a user-uploaded cover image.
 * @param root0.searchBooks Executes remote book search by query.
 * @param root0.setZoomFactor Applies an absolute zoom factor.
 * @param root0.shiftZoomFactor Applies a relative zoom factor delta.
 * @param root0.userData Returns the app user-data directory path.
 * @param root0.writeState Persists renderer state payload to disk.
 */
export function registerIpcHandlers({
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
}: RegisterIpcHandlersArgs): void {
  ipcMain.handle("plan:sample", async () => await runBridge(["--sample"]));
  ipcMain.handle("plan:generate", async (_event, payload: JsonValue) =>
    await runBridge([], payload),
  );
  ipcMain.handle("book:search", async (_event, query: string) =>
    await searchBooks(String(query || "")),
  );
  ipcMain.handle(
    "book:downloadCover",
    async (_event, payload: DownloadCoverPayload | null) => {
      const request = asDownloadCoverPayload(payload);
      return await downloadCover(request.url, request.bookId, userData());
    },
  );
  ipcMain.handle(
    "book:saveUploadedCover",
    (_event, payload: UploadCoverPayload | null) => {
      const request = asUploadCoverPayload(payload);
      return saveUploadedCover(request.dataUrl, request.bookId, userData());
    },
  );
  ipcMain.handle("state:load", () => readState(userData()));
  ipcMain.handle("state:save", (_event, payload: JsonValue) => {
    const result = writeState(userData(), payload);
    if (!result.ok) {
      throw new Error(result.error ?? "Failed to save state");
    }
    return result;
  });
  ipcMain.handle("window:zoomIn", (event) =>
    shiftZoomFactor(event.sender, UI_SCALE_STEP),
  );
  ipcMain.handle("window:zoomOut", (event) =>
    shiftZoomFactor(event.sender, -UI_SCALE_STEP),
  );
  ipcMain.handle("window:zoomReset", (event) =>
    setZoomFactor(event.sender, initialZoomFactor()),
  );
}
