import type { WebContents } from "electron";

import type { JsonValue } from "./core_json.js";

/**
 * Payload shape accepted for remote cover download requests.
 */
export interface DownloadCoverPayload {
  bookId?: string;
  url?: string;
}

/**
 * Payload shape accepted for uploaded cover persistence requests.
 */
export interface UploadCoverPayload {
  bookId?: string;
  dataUrl?: string;
}

/**
 * Result shape returned by state-store writes.
 */
export type SaveResult = { ok: true } | { ok: false; error: string };

export interface RegisterIpcHandlersArgs {
  downloadCover(
    this: void,
    coverUrl: string | undefined,
    bookId: string | undefined,
    userDataDir: string | undefined,
  ): Promise<string>;
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
  userData(this: void): string;
  writeState(this: void, userDataDir: string, payload: JsonValue): SaveResult;
}
