import type { JsonValue } from "../types_json";
import type { WebContents } from "electron";

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
  writeState(
    this: void,
    userDataDir: string,
    payload: JsonValue,
  ): { error?: string; ok: boolean };
}
