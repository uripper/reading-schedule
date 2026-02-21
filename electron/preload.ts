import { contextBridge, ipcRenderer } from "electron";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type PlannerApi = {
  downloadCover: (
    url: string | undefined,
    bookId: string | undefined,
  ) => Promise<string>;
  saveUploadedCover: (
    dataUrl: string | undefined,
    bookId: string | undefined,
  ) => Promise<string>;
  findInPage: (payload: {
    query?: string;
    forward?: boolean;
    findNext?: boolean;
  }) => Promise<{ matches: number; activeMatchOrdinal: number }>;
  generate: (payload: JsonValue) => Promise<JsonValue>;
  loadState: () => Promise<JsonValue>;
  sample: () => Promise<JsonValue>;
  saveState: (payload: JsonValue) => Promise<{ ok?: boolean; error?: string }>;
  searchBooks: (query: string) => Promise<JsonValue[]>;
  stopFindInPage: () => Promise<{
    matches: number;
    activeMatchOrdinal: number;
  }>;
  zoomIn: () => Promise<number>;
  zoomOut: () => Promise<number>;
  zoomReset: () => Promise<number>;
};

const plannerApi: PlannerApi = {
  sample: () => ipcRenderer.invoke("plan:sample"),
  generate: (payload: JsonValue) =>
    ipcRenderer.invoke("plan:generate", payload),
  searchBooks: (query: string) => ipcRenderer.invoke("book:search", query),
  downloadCover: (url: string | undefined, bookId: string | undefined) =>
    ipcRenderer.invoke("book:downloadCover", { url, bookId }),
  saveUploadedCover: (
    dataUrl: string | undefined,
    bookId: string | undefined,
  ) => ipcRenderer.invoke("book:saveUploadedCover", { dataUrl, bookId }),
  findInPage: (payload: {
    query?: string;
    forward?: boolean;
    findNext?: boolean;
  }) => ipcRenderer.invoke("window:findInPage", payload),
  loadState: () => ipcRenderer.invoke("state:load"),
  saveState: (payload: JsonValue) => ipcRenderer.invoke("state:save", payload),
  stopFindInPage: () => ipcRenderer.invoke("window:stopFindInPage"),
  zoomIn: () => ipcRenderer.invoke("window:zoomIn"),
  zoomOut: () => ipcRenderer.invoke("window:zoomOut"),
  zoomReset: () => ipcRenderer.invoke("window:zoomReset"),
};

contextBridge.exposeInMainWorld("plannerApi", plannerApi);
