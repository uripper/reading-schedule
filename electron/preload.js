const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("plannerApi", {
  sample: () => ipcRenderer.invoke("plan:sample"),
  generate: (payload) => ipcRenderer.invoke("plan:generate", payload),
  loadState: () => ipcRenderer.invoke("state:load"),
  saveState: (payload) => ipcRenderer.invoke("state:save", payload),
});
