import { el } from "./dom.js";

const logs = [];

function ts() {
  return new Date().toLocaleTimeString();
}

function renderLogs() {
  el("logOutput").textContent = logs.join("\n") || "No logs yet.";
}

export function addLog(message) {
  logs.unshift(`[${ts()}] ${message}`);
  if (logs.length > 250) logs.pop();
  renderLogs();
}

export function bindHelpDialog() {
  const dlg = el("helpDialog");
  el("helpBtn").onclick = () => dlg.showModal();
  el("closeHelpBtn").onclick = () => dlg.close();
  dlg.addEventListener("cancel", (e) => {
    e.preventDefault();
    dlg.close();
  });
  renderLogs();
}
