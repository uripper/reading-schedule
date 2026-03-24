import type {
    AnnouncePoliteness,
    DocumentPreferencesInput,
} from "../../types/types.ts";
import { el } from "../dom.ts";
import { bindDialogFocus } from "./a11y-dialog-focus.ts";

const ANNOUNCE_DELAY_MS = 30;
const THEME_SYSTEM = "system";
const THEME_DARK = "dark";
const THEME_LIGHT = "light";

// TODO: Move interfaces and types to our contracts package
interface AnnouncementArgs {
    clearTimer: ReturnType<typeof setTimeout> | null;
    message: string;
    politeness: AnnouncePoliteness;
    region: HTMLElement;
}

interface AnnouncerState {
    clearTimer: ReturnType<typeof setTimeout> | null;
    region: HTMLElement;
}

/**
 * Focuses the first invalid field within a form-like container.
 * @param formElement - Container to scan for invalid controls.
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
 * @param regionId - DOM id of the live region element.
 * @returns Function that posts a message to the live region.
 */
export function createAnnouncer(
    regionId = "liveRegion",
): (message: string, politeness?: AnnouncePoliteness) => void {
    const STATE: AnnouncerState = { clearTimer: null, region: el(regionId) };
    return (
        message: string,
        politeness: AnnouncePoliteness = "polite",
    ): void => {
        announceMessage(STATE, message, politeness);
    };
}

function clearAnnouncerTimer(
    timer: ReturnType<typeof setTimeout> | null,
): void {
    if (timer !== null) {
        clearTimeout(timer);
    }
}

function scheduleAnnouncement(
    region: HTMLElement,
    message: string,
): ReturnType<typeof setTimeout> {
    const REGION = region;
    return setTimeout(() => {
        REGION.textContent = String(message);
    }, ANNOUNCE_DELAY_MS);
}

function prepareAnnouncementRegion(
    region: HTMLElement,
    politeness: AnnouncePoliteness,
    clearTimer: ReturnType<typeof setTimeout> | null,
): void {
    const REGION = region;
    clearAnnouncerTimer(clearTimer);
    REGION.setAttribute("aria-live", politeness);
    REGION.textContent = "";
}

function postAnnouncement(
    options: AnnouncementArgs,
): ReturnType<typeof setTimeout> {
    prepareAnnouncementRegion(
        options.region,
        options.politeness,
        options.clearTimer,
    );
    return scheduleAnnouncement(options.region, options.message);
}

function announceMessage(
    state: AnnouncerState,
    message: string,
    politeness: AnnouncePoliteness,
): void {
    const STATE = state;
    if (!message) {
        return;
    }
    STATE.clearTimer = postAnnouncement({
        clearTimer: STATE.clearTimer,
        message,
        politeness,
        region: STATE.region,
    });
}

function resolvedDocumentTheme(preferences: DocumentPreferencesInput): string {
    const THEME = preferences.theme;
    if (
        THEME === THEME_SYSTEM ||
        THEME === THEME_LIGHT ||
        THEME === THEME_DARK
    ) {
        return THEME;
    }
    return THEME_SYSTEM;
}

/**
 * Applies theme and reduced-motion preferences to document data attributes.
 * @param preferences - User preference values to apply.
 */
export function applyPreferencesToDocument(
    preferences: DocumentPreferencesInput = {},
): void {
    const ROOT = document.documentElement;
    ROOT.dataset.theme = resolvedDocumentTheme(preferences);
    let reduceMotion = false;
    if (preferences.reduceMotion !== undefined) {
        reduceMotion = Boolean(preferences.reduceMotion);
    }
    ROOT.dataset.reduceMotion = String(reduceMotion);
}

export { bindDialogFocus };
