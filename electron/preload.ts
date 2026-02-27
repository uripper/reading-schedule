/**
 * @file Preload bridge exposing a typed planner API to the renderer.
 */
import { contextBridge, ipcRenderer } from "electron";
import type {
  BookLookupItem,
  LoadedPlannerState,
  PlanGeneratePayload,
  PlannerApi,
  PlannerResult,
  PlannerSaveResult,
  PlannerStateSnapshot,
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

const plannerApi: PlannerApi = {
  sample: async (): Promise<Pick<PlannerStateSnapshot, "settings" | "books">> =>
    await invokeIpc<Pick<PlannerStateSnapshot, "settings" | "books">>(
      "plan:sample",
    ),
  generate: async (
    payload: PlanGeneratePayload,
  ): Promise<Pick<PlannerResult, "schedule" | "summary">> =>
    await invokeIpc<Pick<PlannerResult, "schedule" | "summary">>(
      "plan:generate",
      payload,
    ),
  searchBooks: async (query: string): Promise<BookLookupItem[]> =>
    await invokeIpc<BookLookupItem[]>("book:search", query),
  downloadCover: async (
    url: string | undefined,
    bookId: string | undefined,
  ): Promise<string> =>
    await invokeIpc<string>("book:downloadCover", { url, bookId }),
  saveUploadedCover: async (
    dataUrl: string | undefined,
    bookId: string | undefined,
  ): Promise<string> =>
    await invokeIpc<string>("book:saveUploadedCover", { dataUrl, bookId }),
  loadState: async (): Promise<LoadedPlannerState | null | undefined> =>
    await invokeIpc<LoadedPlannerState | null | undefined>("state:load"),
  saveState: async (
    payload: PlannerStateSnapshot,
  ): Promise<PlannerSaveResult> =>
    await invokeIpc<PlannerSaveResult>("state:save", payload),
  zoomIn: async (): Promise<number> => await invokeIpc<number>("window:zoomIn"),
  zoomOut: async (): Promise<number> => await invokeIpc<number>("window:zoomOut"),
  zoomReset: async (): Promise<number> => await invokeIpc<number>("window:zoomReset"),
};

contextBridge.exposeInMainWorld("plannerApi", plannerApi);
