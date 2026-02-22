/**
 * @file Preload bridge exposing a typed planner API to the renderer.
 */
import { contextBridge, ipcRenderer } from "electron";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

interface PlannerApi {
  downloadCover(
    url: string | undefined,
    bookId: string | undefined,
  ): Promise<string>;
  saveUploadedCover(
    dataUrl: string | undefined,
    bookId: string | undefined,
  ): Promise<string>;
  findInPage(payload: {
    query?: string;
    forward?: boolean;
    findNext?: boolean;
  }): Promise<{ matches: number; activeMatchOrdinal: number }>;
  generate(payload: JsonValue): Promise<JsonValue>;
  loadState(): Promise<JsonValue>;
  sample(): Promise<JsonValue>;
  saveState(payload: JsonValue): Promise<{ ok?: boolean; error?: string }>;
  searchBooks(query: string): Promise<JsonValue[]>;
  stopFindInPage(): Promise<{
    matches: number;
    activeMatchOrdinal: number;
  }>;
  zoomIn(): Promise<number>;
  zoomOut(): Promise<number>;
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
