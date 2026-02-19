import { contextBridge, ipcRenderer } from 'electron';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type PlannerApi = {
  downloadCover: (url: string | undefined, bookId: string | undefined) => Promise<string>;
  generate: (payload: JsonValue) => Promise<JsonValue>;
  loadState: () => Promise<JsonValue>;
  sample: () => Promise<JsonValue>;
  saveState: (payload: JsonValue) => Promise<{ ok?: boolean; error?: string }>;
  searchBooks: (query: string) => Promise<JsonValue[]>;
};

const plannerApi: PlannerApi = {
  sample: () => ipcRenderer.invoke('plan:sample'),
  generate: (payload: JsonValue) => ipcRenderer.invoke('plan:generate', payload),
  searchBooks: (query: string) => ipcRenderer.invoke('book:search', query),
  downloadCover: (url: string | undefined, bookId: string | undefined) =>
    ipcRenderer.invoke('book:downloadCover', { url, bookId }),
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (payload: JsonValue) => ipcRenderer.invoke('state:save', payload),
};

contextBridge.exposeInMainWorld('plannerApi', plannerApi);
