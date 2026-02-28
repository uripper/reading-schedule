import { normalizeSession } from "../../sessions/normalize.js";
import { sessionKeyFor } from "../../calendar/utils.js";
import { dayBookCompletionKey } from "../calendar_interactions/index.js";
import { TINY_START_MINUTES } from "./today_focus.js";
import type { PlannerScheduleRow, FocusSession, Session } from "../../../types/types.js";


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
  const nextButton = button;
  if (isOpen) {
    nextButton.textContent = CLOSE_FOCUS_TEXT;
    nextButton.setAttribute("aria-expanded", "true");
    return;
  }
  nextButton.textContent = OPEN_FOCUS_TEXT;
  nextButton.setAttribute("aria-expanded", "false");
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
  const nextCompletions = {
    ...currentCompletions,
  };
  nextCompletions[sessionKeyFor(row)] = true;
  nextCompletions[dayBookCompletionKey(row.date, row.book_id)] = true;
  return nextCompletions;
}

/**
 * Creates a synthetic session for a Tiny Start action from focus mode.
 * @param session Optional focus session context for title/book attribution.
 * @returns Normalized manual session representing the tiny-start interval.
 */
export function tinyStartSessionFromFocus(
  session: FocusSession | null,
): Session {
  const bookId = session?.bookId;
  const title = session?.title;
  let normalizedBookId = "";
  if (typeof bookId === "string" && bookId.length > 0) {
    normalizedBookId = bookId;
  }
  let normalizedTitle = "Tiny Start";
  if (typeof title === "string" && title.length > 0) {
    normalizedTitle = title;
  }
  const endedAt = new Date().toISOString();
  const startedAt = new Date(
    Date.now() - TINY_START_MINUTES * 60 * 1000,
  ).toISOString();
  return normalizeSession({
    source: "manual",
    book_id: normalizedBookId,
    title: normalizedTitle,
    minutes: TINY_START_MINUTES,
    started_at: startedAt,
    ended_at: endedAt,
    notes: TINY_START_NOTE,
  });
}
