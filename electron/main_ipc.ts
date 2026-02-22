/**
 * @file Main-process IPC registration for planner and window actions.
 */
import { ipcMain, type WebContents } from "electron";
import type { JsonValue } from "./state_store";
import type { WindowFindRequest } from "./window_find";
import { UI_SCALE_STEP } from "./main_zoom";
import {
  asDownloadCoverPayload,
  asUploadCoverPayload,
  type DownloadCoverPayload,
  type UploadCoverPayload,
} from "./main_ipc_payloads";

interface RegisterIpcHandlersArgs {
  downloadCover(
    coverUrl: string | undefined,
    bookId: string | undefined,
    userDataDir: string | undefined,
  ): Promise<string>;
  findInPage(
    webContents: WebContents,
    payload: WindowFindRequest | null,
  ): Promise<unknown> | unknown;
  initialZoomFactor(): number;
  readState(userDataDir: string): unknown;
  runBridge(args: string[], payload?: JsonValue): Promise<unknown>;
  saveUploadedCover(
    coverDataUrl: string | undefined,
    bookId: string | undefined,
    userDataDir: string | undefined,
  ): string;
  searchBooks(query: string): Promise<unknown>;
  setZoomFactor(webContents: WebContents, value: number): number;
  shiftZoomFactor(webContents: WebContents, delta: number): number;
  stopFindInPage(webContents: WebContents): Promise<unknown> | unknown;
  userData(): string;
  writeState(
    userDataDir: string,
    payload: JsonValue,
  ): { error?: string; ok: boolean };
}

/**
 * Registers all main-process IPC handlers consumed by the renderer.
 * @param root0
 * @param root0.downloadCover
 * @param root0.findInPage
 * @param root0.initialZoomFactor
 * @param root0.readState
 * @param root0.runBridge
 * @param root0.saveUploadedCover
 * @param root0.searchBooks
 * @param root0.setZoomFactor
 * @param root0.shiftZoomFactor
 * @param root0.stopFindInPage
 * @param root0.userData
 * @param root0.writeState
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
      throw new Error(result.error || "Failed to save state");
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
    (event, payload: WindowFindRequest | null) =>
      findInPage(event.sender, payload),
  );
  ipcMain.handle("window:stopFindInPage", (event) =>
    stopFindInPage(event.sender),
  );
}
