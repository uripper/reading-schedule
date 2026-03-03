import type { WebContents } from "electron";

import type { JsonValue } from "./types_core.js";
import type {
    PlanGeneratePayload,
    PlannerSaveResult,
    PlannerStateLoadResult,
} from "./types_planner.js";

export interface DownloadCoverPayload {
    bookId?: string;
    url?: string;
}

export interface UploadCoverPayload {
    bookId?: string;
    dataUrl?: string;
}

export interface RegisterIpcHandlersArgs {
    downloadCover(
        this: void,
        coverUrl: string | undefined,
        bookId: string | undefined,
        userDataDir: string | undefined,
    ): Promise<string>;
    initialZoomFactor(this: void): number;
    readState(this: void, userDataDir: string): PlannerStateLoadResult;
    runBridge(
        this: void,
        args: string[],
        payload?: PlanGeneratePayload,
        context?: {
            requestId?: string;
            userDataDir?: string;
        },
    ): Promise<unknown>;
    saveUploadedCover(
        this: void,
        coverDataUrl: string | undefined,
        bookId: string | undefined,
        userDataDir: string | undefined,
    ): string;
    searchBooks(this: void, query: string, author?: boolean): Promise<unknown>;
    setZoomFactor(this: void, webContents: WebContents, value: number): number;
    shiftZoomFactor(
        this: void,
        webContents: WebContents,
        delta: number,
    ): number;
    userData(this: void): string;
    writeState(
        this: void,
        userDataDir: string,
        payload: JsonValue,
    ): PlannerSaveResult;
}
