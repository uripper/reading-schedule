import {
    type AnnouncePoliteness,
    type DocumentPreferencesInput,
} from "../../types/types.js";
import { el } from "../dom.js";

const ANNOUNCE_DELAY_MS = 30;

/**
 * Focuses the first invalid field within a form-like container.
 * @param formElement Container to scan for invalid controls.
 * @returns The focused invalid element, or null when none is found.
 */
export function focusFirstError(
    formElement: HTMLElement | null | undefined,
): HTMLElement | null {
    if (!(formElement instanceof HTMLElement)) {
        return null;
    }
    const INVALID = formElement.querySelector(":invalid");
    if (INVALID instanceof HTMLElement) {
        INVALID.focus();
        return INVALID;
    }
    return null;
}

/**
 * Creates an ARIA live-region announcer function for status messages.
 * @param regionId DOM id of the live region element.
 * @returns Function that posts a message to the live region.
 */
export function createAnnouncer(
    regionId = "liveRegion",
): (message: string, politeness?: AnnouncePoliteness) => void {
    const REGION = el(regionId);
    let clearTimer: ReturnType<typeof setTimeout> | null = null;
    return (
        message: string,
        politeness: AnnouncePoliteness = "polite",
    ): void => {
        if (!message) {
            return;
        }
        if (clearTimer) {
            clearTimeout(clearTimer);
        }
        REGION.setAttribute("aria-live", politeness);
        REGION.textContent = "";
        clearTimer = setTimeout(() => {
            REGION.textContent = String(message);
        }, ANNOUNCE_DELAY_MS);
    };
}

/**
 * Applies theme and reduced-motion preferences to document data attributes.
 * @param preferences User preference values to apply.
 */
export function applyPreferencesToDocument(
    preferences: DocumentPreferencesInput = {},
): void {
    let theme = "system";
    if (
        typeof preferences.theme === "string" &&
        ["system", "light", "dark"].includes(preferences.theme)
    ) {
        theme = preferences.theme;
    }
    const REDUCE_MOTION = Boolean(preferences.reduceMotion);
    const ROOT = document.documentElement;
    ROOT.dataset.theme = theme;
    ROOT.dataset.reduceMotion = "false";
    if (REDUCE_MOTION) {
        ROOT.dataset.reduceMotion = "true";
    }
}

export { bindDialogFocus } from "./a11y_dialog_focus.js";
