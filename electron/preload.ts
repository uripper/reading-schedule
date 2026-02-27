/**
 * @file Preload bridge exposing a typed planner API to the renderer.
 */
import { contextBridge, ipcRenderer } from "electron";
import type { JsonValue } from "./types/types_json";

interface PlannerApi {
  /** Downloads a remote cover image and stores it for the given book id. */
  downloadCover(
    url: string | undefined,
    bookId: string | undefined,
  ): Promise<string>;
  /** Saves a user-uploaded cover data URL for the given book id. */
  saveUploadedCover(
    dataUrl: string | undefined,
    bookId: string | undefined,
  ): Promise<string>;
  /** Generates a plan from renderer-provided planner payload data. */
  generate(payload: JsonValue): Promise<JsonValue>;
  /** Loads persisted planner state from the main process. */
  loadState(): Promise<JsonValue>;
  /** Returns sample planner data for quick testing and onboarding flows. */
  sample(): Promise<JsonValue>;
  /** Saves planner state and returns a structured success/error payload. */
  saveState(payload: JsonValue): Promise<{ ok?: boolean; error?: string }>;
  /** Searches external book providers and returns raw search result rows. */
  searchBooks(query: string): Promise<JsonValue[]>;
  /** Increases renderer zoom level and returns the resulting zoom factor. */
  zoomIn(): Promise<number>;
  /** Decreases renderer zoom level and returns the resulting zoom factor. */
  zoomOut(): Promise<number>;
  /** Resets renderer zoom level and returns the resulting zoom factor. */
  zoomReset(): Promise<number>;
}

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
  sample: async (): Promise<JsonValue> => await invokeIpc<JsonValue>("plan:sample"),
  generate: async (payload: JsonValue): Promise<JsonValue> =>
    await invokeIpc<JsonValue>("plan:generate", payload),
  searchBooks: async (query: string): Promise<JsonValue[]> =>
    await invokeIpc<JsonValue[]>("book:search", query),
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
  loadState: async (): Promise<JsonValue> => await invokeIpc<JsonValue>("state:load"),
  saveState: async (
    payload: JsonValue,
  ): Promise<{ ok?: boolean; error?: string }> =>
    await invokeIpc<{ ok?: boolean; error?: string }>("state:save", payload),
  zoomIn: async (): Promise<number> => await invokeIpc<number>("window:zoomIn"),
  zoomOut: async (): Promise<number> => await invokeIpc<number>("window:zoomOut"),
  zoomReset: async (): Promise<number> => await invokeIpc<number>("window:zoomReset"),
};

contextBridge.exposeInMainWorld("plannerApi", plannerApi);
