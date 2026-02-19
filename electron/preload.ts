import { contextBridge, ipcRenderer } from 'electron';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type PlannerApi = {
  downloadCover: (url: string | undefined, bookId: string | undefined) => Promise<string>;
  saveUploadedCover: (dataUrl: string | undefined, bookId: string | undefined) => Promise<string>;
  generate: (payload: JsonValue) => Promise<JsonValue>;
  loadState: () => Promise<JsonValue>;
  sample: () => Promise<JsonValue>;
  saveState: (payload: JsonValue) => Promise<{ ok?: boolean; error?: string }>;
  searchBooks: (query: string) => Promise<JsonValue[]>;
  zoomIn: () => Promise<number>;
  zoomOut: () => Promise<number>;
  zoomReset: () => Promise<number>;
};

const plannerApi: PlannerApi = {
  sample: () => ipcRenderer.invoke('plan:sample'),
  generate: (payload: JsonValue) => ipcRenderer.invoke('plan:generate', payload),
  searchBooks: (query: string) => ipcRenderer.invoke('book:search', query),
  downloadCover: (url: string | undefined, bookId: string | undefined) =>
    ipcRenderer.invoke('book:downloadCover', { url, bookId }),
  saveUploadedCover: (dataUrl: string | undefined, bookId: string | undefined) =>
    ipcRenderer.invoke('book:saveUploadedCover', { dataUrl, bookId }),
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (payload: JsonValue) => ipcRenderer.invoke('state:save', payload),
  zoomIn: () => ipcRenderer.invoke('window:zoomIn'),
  zoomOut: () => ipcRenderer.invoke('window:zoomOut'),
  zoomReset: () => ipcRenderer.invoke('window:zoomReset'),
};

contextBridge.exposeInMainWorld('plannerApi', plannerApi);
