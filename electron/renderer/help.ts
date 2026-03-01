import { bindDialogFocus } from "./accessibility/index.js";
import { el } from "./dom.js";

const LOGS: string[] = [];
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
    const LOG_OUTPUT = document.getElementById("logOutput");
    if (!(LOG_OUTPUT instanceof HTMLElement)) {
        return;
    }
    LOG_OUTPUT.textContent = LOGS.join("\n") || "No logs yet.";
}

/**
 * Adds a log line to help dialog output with timestamp prefix.
 * @param message Log message text to append.
 */
export function addLog(message: string): void {
    LOGS.unshift(`[${ts()}] ${message}`);
    if (LOGS.length > MAX_LOG_LINES) {
        LOGS.pop();
    }
    renderLogs();
}

/**
 * Binds help dialog open/close controls with focus restoration behavior.
 */
export function bindHelpDialog(): void {
    const DLG = el<HTMLDialogElement>("helpDialog");
    const FOCUS = bindDialogFocus(DLG, {
        initialFocusSelector: "#closeHelpBtn",
    });
    el<HTMLButtonElement>("helpBtn").onclick = () => {
        FOCUS.rememberOpener();
        DLG.showModal();
        FOCUS.focusInitialTarget();
    };
    el<HTMLButtonElement>("closeHelpBtn").onclick = (): void => {
        FOCUS.closeAndReturnFocus();
    };
    DLG.addEventListener("cancel", (e) => {
        e.preventDefault();
        FOCUS.closeAndReturnFocus();
    });
    renderLogs();
}
