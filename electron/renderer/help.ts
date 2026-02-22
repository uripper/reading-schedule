import { el } from "./dom.js";
import { bindDialogFocus } from "./a11y.js";

const logs: string[] = [];
const MAX_LOG_LINES = 250;

function ts() {
  return new Date().toLocaleTimeString();
}

function renderLogs() {
  el("logOutput").textContent = logs.join("\n") || "No logs yet.";
}

/**
 * Adds a log message with timestamp to the logs array and renders the output.
 */
export function addLog(message: string) {
  logs.unshift(`[${ts()}] ${message}`);
  if (logs.length > MAX_LOG_LINES) {
    logs.pop();
  }
  renderLogs();
}

/**
 * Binds the help dialog's open and close functionality, including focus management for accessibility.
 */
export function bindHelpDialog() {
  const dlg = el<HTMLDialogElement>("helpDialog");
  const focus = bindDialogFocus(dlg, { initialFocusSelector: "#closeHelpBtn" });
  el<HTMLButtonElement>("helpBtn").onclick = () => {
    focus.rememberOpener();
    dlg.showModal();
    focus.focusInitialTarget();
  };
  el<HTMLButtonElement>("closeHelpBtn").onclick = () =>
    { focus.closeAndReturnFocus(); };
  dlg.addEventListener("cancel", (e) => {
    e.preventDefault();
    focus.closeAndReturnFocus();
  });
  renderLogs();
}
