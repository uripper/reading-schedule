import { contextBridge, ipcRenderer } from "electron";
import type { PlannerAdapter } from "@reading-schedule/contracts";

const IPC = {
  generate: "planner:generate",
  loadState: "planner:load-state",
  saveState: "planner:save-state",
  searchBooks: "planner:search-books",
  downloadCover: "planner:download-cover",
} as const;

const plannerApi: PlannerAdapter = {
  generatePlan: (payload) => ipcRenderer.invoke(IPC.generate, payload),
  loadState: () => ipcRenderer.invoke(IPC.loadState),
  saveState: (state) => ipcRenderer.invoke(IPC.saveState, state),
  searchBooks: (query) => ipcRenderer.invoke(IPC.searchBooks, query),
  downloadCover: (url, bookId) => ipcRenderer.invoke(IPC.downloadCover, url, bookId),
};

contextBridge.exposeInMainWorld("plannerApi", plannerApi);
