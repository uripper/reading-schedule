import { ipcMain, type WebContents } from "electron";
import type { JsonValue } from "./state_store";
import type { WindowFindRequest } from "./window_find";
import { UI_SCALE_STEP } from "./main_zoom";

type DownloadCoverPayload = {
  bookId?: string;
  url?: string;
};

type UploadCoverPayload = {
  bookId?: string;
  dataUrl?: string;
};

type RegisterIpcHandlersArgs = {
  downloadCover: (
    coverUrl: string | undefined,
    bookId: string | undefined,
    userDataDir: string | undefined,
  ) => Promise<string>;
  findInPage: (
    webContents: WebContents,
    payload: WindowFindRequest | null,
  ) => Promise<unknown> | unknown;
  initialZoomFactor: () => number;
  readState: (userDataDir: string) => unknown;
  runBridge: (args: string[], payload?: JsonValue) => Promise<unknown>;
  saveUploadedCover: (
    coverDataUrl: string | undefined,
    bookId: string | undefined,
    userDataDir: string | undefined,
  ) => string;
  searchBooks: (query: string) => Promise<unknown>;
  setZoomFactor: (webContents: WebContents, value: number) => number;
  shiftZoomFactor: (webContents: WebContents, delta: number) => number;
  stopFindInPage: (webContents: WebContents) => Promise<unknown> | unknown;
  userData: () => string;
  writeState: (
    userDataDir: string,
    payload: JsonValue,
  ) => { error?: string; ok: boolean };
};

function asDownloadCoverPayload(
  value: DownloadCoverPayload | null,
): DownloadCoverPayload {
  if (!value) {
    return {};
  }
  return {
    url: value.url,
    bookId: value.bookId,
  };
}

function asUploadCoverPayload(
  value: UploadCoverPayload | null,
): UploadCoverPayload {
  if (!value) {
    return {};
  }
  return {
    dataUrl: value.dataUrl,
    bookId: value.bookId,
  };
}

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
  ipcMain.handle("plan:sample", () => runBridge(["--sample"]));
  ipcMain.handle("plan:generate", (_event, payload: JsonValue) =>
    runBridge([], payload),
  );
  ipcMain.handle("book:search", (_event, query: string) =>
    searchBooks(String(query || "")),
  );
  ipcMain.handle(
    "book:downloadCover",
    (_event, payload: DownloadCoverPayload | null) => {
      const request = asDownloadCoverPayload(payload);
      return downloadCover(request.url, request.bookId, userData());
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
    if (result.ok === false) {
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
