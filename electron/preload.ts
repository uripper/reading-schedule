import { contextBridge, ipcRenderer } from 'electron';

type PlannerApi = {
  downloadCover: (url: string | undefined, bookId: string | undefined) => Promise<string>;
  generate: (payload: unknown) => Promise<unknown>;
  loadState: () => Promise<unknown>;
  sample: () => Promise<unknown>;
  saveState: (payload: unknown) => Promise<unknown>;
  searchBooks: (query: string) => Promise<unknown>;
};

const plannerApi: PlannerApi = {
  sample: () => ipcRenderer.invoke('plan:sample'),
  generate: (payload: unknown) => ipcRenderer.invoke('plan:generate', payload),
  searchBooks: (query: string) => ipcRenderer.invoke('book:search', query),
  downloadCover: (url: string | undefined, bookId: string | undefined) =>
    ipcRenderer.invoke('book:downloadCover', { url, bookId }),
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (payload: unknown) => ipcRenderer.invoke('state:save', payload),
};

contextBridge.exposeInMainWorld('plannerApi', plannerApi);
