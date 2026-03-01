import {
    type FocusSession,
    type PlannerScheduleRow,
    type Session,
} from "../../../types/types.js";
import { sessionKeyFor } from "../../calendar/utils.js";
import { normalizeSession } from "../../sessions/normalize.js";
import { dayBookCompletionKey } from "../calendar_interactions/index.js";
import { TINY_START_MINUTES } from "./today_focus.js";

const CLOSE_FOCUS_TEXT = "Close Focus Controls";
const OPEN_FOCUS_TEXT = "Open Focus Controls";
const TINY_START_NOTE = "Logged from Today Focus Tiny Start.";

/**
 * Updates the focus entry button text/aria state for open or closed mode.
 * @param button Focus entry toggle button.
 * @param isOpen Whether focus controls are currently open.
 */
export function setFocusEntryButtonState(
    button: HTMLButtonElement,
    isOpen: boolean,
): void {
    const NEXT_BUTTON = button;
    if (isOpen) {
        NEXT_BUTTON.textContent = CLOSE_FOCUS_TEXT;
        NEXT_BUTTON.setAttribute("aria-expanded", "true");
        return;
    }
    NEXT_BUTTON.textContent = OPEN_FOCUS_TEXT;
    NEXT_BUTTON.setAttribute("aria-expanded", "false");
}

/**
 * Returns completion state with the given row marked complete by both key styles.
 * @param currentCompletions Existing schedule completion map.
 * @param row Planned row being marked complete.
 * @returns Completion map containing updated session and day-book keys.
 */
export function nextCompletionsWithRowMarkedComplete(
    currentCompletions: Record<string, boolean>,
    row: PlannerScheduleRow,
): Record<string, boolean> {
    const NEXT_COMPLETIONS = {
        ...currentCompletions,
    };
    NEXT_COMPLETIONS[sessionKeyFor(row)] = true;
    NEXT_COMPLETIONS[dayBookCompletionKey(row.date, row.book_id)] = true;
    return NEXT_COMPLETIONS;
}

/**
 * Creates a synthetic session for a Tiny Start action from focus mode.
 * @param session Optional focus session context for title/book attribution.
 * @returns Normalized manual session representing the tiny-start interval.
 */
export function tinyStartSessionFromFocus(
    session: FocusSession | null,
): Session {
    const BOOK_ID = session?.bookId;
    const TITLE = session?.title;
    let normalizedBookId = "";
    if (typeof BOOK_ID === "string" && BOOK_ID.length > 0) {
        normalizedBookId = BOOK_ID;
    }
    let normalizedTitle = "Tiny Start";
    if (typeof TITLE === "string" && TITLE.length > 0) {
        normalizedTitle = TITLE;
    }
    const ENDED_AT = new Date().toISOString();
    const STARTED_AT = new Date(
        Date.now() - TINY_START_MINUTES * 60 * 1000,
    ).toISOString();
    return normalizeSession({
        book_id: normalizedBookId,
        ended_at: ENDED_AT,
        minutes: TINY_START_MINUTES,
        notes: TINY_START_NOTE,
        source: "manual",
        started_at: STARTED_AT,
        title: normalizedTitle,
    });
}
