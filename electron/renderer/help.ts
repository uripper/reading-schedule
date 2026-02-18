// @ts-nocheck
import { el } from "./dom.js";
import { bindDialogFocus } from "./a11y.js";

const logs = [];
const MAX_LOG_LINES = 250;

function ts() {
  return new Date().toLocaleTimeString();
}

function renderLogs() {
  el("logOutput").textContent = logs.join("\n") || "No logs yet.";
}

export function addLog(message) {
  logs.unshift(`[${ts()}] ${message}`);
  if (logs.length > MAX_LOG_LINES) {
    logs.pop();
  }
  renderLogs();
}

export function bindHelpDialog() {
  const dlg = el("helpDialog");
  const focus = bindDialogFocus(dlg, { initialFocusSelector: "#closeHelpBtn" });
  el("helpBtn").onclick = () => {
    focus.rememberOpener();
    dlg.showModal();
    focus.focusInitialTarget();
  };
  el("closeHelpBtn").onclick = () => focus.closeAndReturnFocus();
  dlg.addEventListener("cancel", (e) => {
    e.preventDefault();
    focus.closeAndReturnFocus();
  });
  renderLogs();
}
