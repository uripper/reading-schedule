import { bindDialogFocus } from "./accessibility/index.js";
import { el } from "./dom.js";

const logs: string[] = [];
const MAX_LOG_LINES = 250;

/**
 * Returns localized current time string for help-panel logs.
 * @returns Time string for log prefix.
 */
function ts(): string {
    return new Date().toLocaleTimeString();
}

/**
 * Checks whether DOM APIs needed for log rendering are available.
 * @returns True when a browser document is available.
 */
function canRenderLogs(): boolean {
    return typeof document !== "undefined";
}

/**
 * Renders in-memory log lines into help dialog output panel.
 */
function renderLogs(): void {
    if (!canRenderLogs()) {
        return;
    }
    const logOutput = document.getElementById("logOutput");
    if (!(logOutput instanceof HTMLElement)) {
        return;
    }
    logOutput.textContent = logs.join("\n") || "No logs yet.";
}

/**
 * Adds a log line to help dialog output with timestamp prefix.
 * @param message Log message text to append.
 */
export function addLog(message: string): void {
    logs.unshift(`[${ts()}] ${message}`);
    if (logs.length > MAX_LOG_LINES) {
        logs.pop();
    }
    renderLogs();
}

/**
 * Binds help dialog open/close controls with focus restoration behavior.
 */
export function bindHelpDialog(): void {
    const dlg = el<HTMLDialogElement>("helpDialog");
    const focus = bindDialogFocus(dlg, {
        initialFocusSelector: "#closeHelpBtn",
    });
    el<HTMLButtonElement>("helpBtn").onclick = () => {
        focus.rememberOpener();
        dlg.showModal();
        focus.focusInitialTarget();
    };
    el<HTMLButtonElement>("closeHelpBtn").onclick = (): void => {
        focus.closeAndReturnFocus();
    };
    dlg.addEventListener("cancel", (e) => {
        e.preventDefault();
        focus.closeAndReturnFocus();
    });
    renderLogs();
}
