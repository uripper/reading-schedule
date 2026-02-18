import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("plannerApi", {
  sample: () => ipcRenderer.invoke("plan:sample"),
  generate: (payload) => ipcRenderer.invoke("plan:generate", payload),
  searchBooks: (query) => ipcRenderer.invoke("book:search", query),
  downloadCover: (url, bookId) => ipcRenderer.invoke("book:downloadCover", { url, bookId }),
  loadState: () => ipcRenderer.invoke("state:load"),
  saveState: (payload) => ipcRenderer.invoke("state:save", payload),
});
