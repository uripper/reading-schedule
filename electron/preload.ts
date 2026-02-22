/**
 * @file Preload bridge exposing a typed planner API to the renderer.
 */
import { contextBridge, ipcRenderer } from "electron";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

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
  /** Runs find-in-page for the current web contents and returns match metadata. */
  findInPage(payload: {
    query?: string;
    forward?: boolean;
    findNext?: boolean;
  }): Promise<{ matches: number; activeMatchOrdinal: number }>;
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
  /** Stops active find-in-page highlighting and returns final match metadata. */
  stopFindInPage(): Promise<{
    matches: number;
    activeMatchOrdinal: number;
  }>;
  /** Increases renderer zoom level and returns the resulting zoom factor. */
  zoomIn(): Promise<number>;
  /** Decreases renderer zoom level and returns the resulting zoom factor. */
  zoomOut(): Promise<number>;
  /** Resets renderer zoom level and returns the resulting zoom factor. */
  zoomReset(): Promise<number>;
}

const plannerApi: PlannerApi = {
  sample: async () => await ipcRenderer.invoke("plan:sample"),
  generate: async (payload: JsonValue) =>
    await ipcRenderer.invoke("plan:generate", payload),
  searchBooks: async (query: string) => await ipcRenderer.invoke("book:search", query),
  downloadCover: async (url: string | undefined, bookId: string | undefined) =>
    await ipcRenderer.invoke("book:downloadCover", { url, bookId }),
  saveUploadedCover: async (
    dataUrl: string | undefined,
    bookId: string | undefined,
  ) => await ipcRenderer.invoke("book:saveUploadedCover", { dataUrl, bookId }),
  findInPage: async (payload: {
    query?: string;
    forward?: boolean;
    findNext?: boolean;
  }) => await ipcRenderer.invoke("window:findInPage", payload),
  loadState: async () => await ipcRenderer.invoke("state:load"),
  saveState: async (payload: JsonValue) => await ipcRenderer.invoke("state:save", payload),
  stopFindInPage: async () => await ipcRenderer.invoke("window:stopFindInPage"),
  zoomIn: async () => await ipcRenderer.invoke("window:zoomIn"),
  zoomOut: async () => await ipcRenderer.invoke("window:zoomOut"),
  zoomReset: async () => await ipcRenderer.invoke("window:zoomReset"),
};

contextBridge.exposeInMainWorld("plannerApi", plannerApi);
