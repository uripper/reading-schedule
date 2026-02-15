const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("plannerApi", {
  sample: () => ipcRenderer.invoke("plan:sample"),
  generate: (payload) => ipcRenderer.invoke("plan:generate", payload),
});
