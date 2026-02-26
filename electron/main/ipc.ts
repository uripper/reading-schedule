/**
 * @file Main-process IPC registration for planner and window actions.
 */
import { ipcMain, type WebContents } from "electron";
import type { JsonValue } from "../types/types_json";
import type { WindowFindRequest, WindowFindResponse } from "./window_find";
import { UI_SCALE_STEP } from "./zoom";
import {
  asDownloadCoverPayload,
  asUploadCoverPayload,
  type DownloadCoverPayload,
  type UploadCoverPayload,
} from "./ipc_payloads";

interface RegisterIpcHandlersArgs {
  downloadCover(
    this: void,
    coverUrl: string | undefined,
    bookId: string | undefined,
    userDataDir: string | undefined,
  ): Promise<string>;
  findInPage(
    this: void,
    webContents: WebContents,
    payload: WindowFindRequest | null,
  ): Promise<WindowFindResponse> | WindowFindResponse;
  initialZoomFactor(this: void): number;
  readState(this: void, userDataDir: string): unknown;
  runBridge(this: void, args: string[], payload?: JsonValue): Promise<unknown>;
  saveUploadedCover(
    this: void,
    coverDataUrl: string | undefined,
    bookId: string | undefined,
    userDataDir: string | undefined,
  ): string;
  searchBooks(this: void, query: string): Promise<unknown>;
  setZoomFactor(this: void, webContents: WebContents, value: number): number;
  shiftZoomFactor(this: void, webContents: WebContents, delta: number): number;
  stopFindInPage(
    this: void,
    webContents: WebContents,
  ): Promise<WindowFindResponse> | WindowFindResponse;
  userData(this: void): string;
  writeState(
    this: void,
    userDataDir: string,
    payload: JsonValue,
  ): { error?: string; ok: boolean };
}

/**
 * Registers all main-process IPC handlers consumed by the renderer.
 * @param root0 IPC dependency implementations.
 * @param root0.downloadCover Fetches and stores a remote cover image.
 * @param root0.findInPage Triggers in-page find on the active web contents.
 * @param root0.initialZoomFactor Returns the configured initial zoom factor.
 * @param root0.readState Loads persisted renderer state from disk.
 * @param root0.runBridge Invokes the planner bridge command.
 * @param root0.saveUploadedCover Persists a user-uploaded cover image.
 * @param root0.searchBooks Executes remote book search by query.
 * @param root0.setZoomFactor Applies an absolute zoom factor.
 * @param root0.shiftZoomFactor Applies a relative zoom factor delta.
 * @param root0.stopFindInPage Clears active in-page find highlights.
 * @param root0.userData Returns the app user-data directory path.
 * @param root0.writeState Persists renderer state payload to disk.
 */
export function registerIpcHandlers({
  downloadCover,
  findInPage,
  initialZoomFactor,
  readState,
  runBridge,
  saveUploadedCover,
  searchBooks,
  setZoomFactor,
  shiftZoomFactor,
  stopFindInPage,
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
  ipcMain.handle(
    "window:findInPage",
    async (
      event,
      payload: WindowFindRequest | null,
    ): Promise<WindowFindResponse> => await findInPage(event.sender, payload),
  );
  ipcMain.handle(
    "window:stopFindInPage",
    async (event): Promise<WindowFindResponse> =>
      await stopFindInPage(event.sender),
  );
}
