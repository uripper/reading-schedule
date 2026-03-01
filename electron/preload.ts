/**
 * @file Preload bridge exposing a typed planner API to the renderer.
 */
import { contextBridge, ipcRenderer } from "electron";
import {
    type BookLookupItem,
    type PlanGeneratePayload,
    type PlannerApi,
    type PlannerResult,
    type PlannerSaveResult,
    type PlannerStateLoadResult,
    type PlannerStateSnapshot,
} from "./types/types.js";

/**
 * Invokes an IPC channel and narrows the resolved payload to the expected type.
 * @param channel IPC channel name.
 * @param args Optional IPC payload arguments.
 * @returns Promise resolving to the expected typed payload.
 */
async function invokeIpc<T>(channel: string, ...args: unknown[]): Promise<T> {
    return (await ipcRenderer.invoke(channel, ...args)) as T;
}

const PLANNER_API: PlannerApi = {
    downloadCover: async (
        url: string | undefined,
        bookId: string | undefined,
    ): Promise<string> =>
        await invokeIpc<string>("book:downloadCover", { bookId, url }),
    generate: async (
        payload: PlanGeneratePayload,
    ): Promise<Pick<PlannerResult, "schedule" | "summary">> =>
        await invokeIpc<Pick<PlannerResult, "schedule" | "summary">>(
            "plan:generate",
            payload,
        ),
    loadState: async (): Promise<PlannerStateLoadResult> =>
        await invokeIpc<PlannerStateLoadResult>("state:load"),
    sample: async (): Promise<
        Pick<PlannerStateSnapshot, "settings" | "books">
    > =>
        await invokeIpc<Pick<PlannerStateSnapshot, "settings" | "books">>(
            "plan:sample",
        ),
    saveState: async (
        payload: PlannerStateSnapshot,
    ): Promise<PlannerSaveResult> =>
        await invokeIpc<PlannerSaveResult>("state:save", payload),
    saveUploadedCover: async (
        dataUrl: string | undefined,
        bookId: string | undefined,
    ): Promise<string> =>
        await invokeIpc<string>("book:saveUploadedCover", { bookId, dataUrl }),
    searchBooks: async (
        query: string,
        author = false,
    ): Promise<BookLookupItem[]> =>
        await invokeIpc<BookLookupItem[]>("book:search", query, author),
    zoomIn: async (): Promise<number> =>
        await invokeIpc<number>("window:zoomIn"),
    zoomOut: async (): Promise<number> =>
        await invokeIpc<number>("window:zoomOut"),
    zoomReset: async (): Promise<number> =>
        await invokeIpc<number>("window:zoomReset"),
};

contextBridge.exposeInMainWorld("plannerApi", PLANNER_API);
