/**
 * Renders and resets the active Today carousel control panel.
 */
import { el } from "../../dom.ts";
import {
    logSessionButtonText,
} from "./today_carousel_actions.ts";
import type { TodayCarouselActiveItem } from "./today_carousel_model.ts";
import { formatPagesTotalText } from "./today_carousel_progress.ts";

const EDIT_MINUTES_LABEL = "Edit planned minutes";

/**
 * Updates the primary Today action button text and completion styling.
 * @param completed - Whether the active session is complete.
 */
export function setLogButtonState(completed: boolean): void {
    const BUTTON = el<HTMLButtonElement>("todayLogSessionBtn");
    const PANEL = el<HTMLElement>("todayFocusPanel");
    BUTTON.textContent = logSessionButtonText(completed);
    BUTTON.classList.toggle("is-complete", completed);
    PANEL.classList.toggle("is-complete", completed);
}

/**
 * Toggles progress-field editability for the active Today session.
 * @param completed - Whether the active session is complete.
 */
export function setProgressInputsDisabled(completed: boolean): void {
    const DISABLED = completed;
    el<HTMLInputElement>("todayPagesInput").disabled = DISABLED;
    el<HTMLInputElement>("todayPercentInput").disabled = DISABLED;
}

/**
 * Enables or disables the Today log/remove action buttons together.
 * @param disabled - Whether the action buttons should be disabled.
 */
export function setActionButtonsDisabled(disabled: boolean): void {
    el<HTMLButtonElement>("todayLogSessionBtn").disabled = disabled;
    el<HTMLButtonElement>("todayRemoveSessionBtn").disabled = disabled;
}

/**
 * Enables or disables the Today planned-minutes edit button.
 * @param disabled - Whether the button should be disabled.
 */
export function setMinutesEditDisabled(disabled: boolean): void {
    const EDIT_BUTTON = el<HTMLButtonElement>("todayMinutesEditBtn");
    EDIT_BUTTON.disabled = disabled;
    if (disabled) {
        EDIT_BUTTON.textContent = "✎";
        EDIT_BUTTON.setAttribute("aria-label", EDIT_MINUTES_LABEL);
    }
}

/**
 * Clears stale event handlers when the Today carousel has no active row.
 */
export function clearNoDataHandlers(): void {
    el<HTMLButtonElement>("todayLogSessionBtn").onclick = null;
    el<HTMLButtonElement>("todayRemoveSessionBtn").onclick = null;
    el<HTMLButtonElement>("todayMinutesEditBtn").onclick = null;
    el<HTMLInputElement>("todayMinutesInput").oninput = null;
    el<HTMLInputElement>("todayMinutesInput").onkeydown = null;
    el<HTMLInputElement>("todayPagesInput").oninput = null;
    el<HTMLInputElement>("todayPercentInput").oninput = null;
}

/**
 * Formats the projected post-session progress summary for the active row.
 * @param active - Active carousel item.
 * @returns Display text for the after-session summary.
 */
export function afterSessionText(active: TodayCarouselActiveItem): string {
    let pages = "--";
    if (active.afterPagesRead !== null) {
        pages = String(active.afterPagesRead);
    }
    const PERCENT = `${Math.round(active.afterPercent * 10) / 10}%`;
    return `${pages} pages\n${PERCENT}`;
}

/**
 * Renders the after-session summary text block.
 * @param text - Preformatted after-session summary text.
 */
export function renderAfterSessionText(text: string): void {
    const AFTER_SESSION = el<HTMLElement>("todayAfterSessionText");
    const LABEL = document.createElement("span");
    LABEL.className = "today-after-session-label";
    LABEL.textContent = "After Session:";
    const VALUES = document.createElement("span");
    VALUES.className = "today-after-session-values";
    VALUES.textContent = text;
    AFTER_SESSION.replaceChildren(LABEL, VALUES);
}

/**
 * Updates the page-total progress summary for the active Today book.
 * @param active - Active carousel item.
 */
export function renderProgressSummary(active: TodayCarouselActiveItem): void {
    el<HTMLElement>("todayProgressPagesTotalText").textContent =
        formatPagesTotalText(active.pagesTotal);
}
