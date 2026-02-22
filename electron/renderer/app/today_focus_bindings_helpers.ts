import { normalizeSession, type Session } from "../sessions/normalize.js";
import { sessionKeyFor } from "../calendar/utils.js";
import { dayBookCompletionKey } from "./calendar_interactions_helpers.js";
import { TINY_START_MINUTES, type FocusSession } from "./today_focus.js";
import type { PlannerResult, PlannerScheduleRow } from "./types.js";

const CLOSE_FOCUS_TEXT = "Close Focus Controls";
const OPEN_FOCUS_TEXT = "Open Focus Controls";
const TINY_START_NOTE = "Logged from Today Focus Tiny Start.";

function roundMinutes(value: number): number {
  return Math.max(1, Math.round(value));
}

function rowMatchesFocusSession(
  row: PlannerScheduleRow,
  session: FocusSession,
): boolean {
  if (String(row.date || "") !== session.date) {
    return false;
  }
  if (session.bookId && String(row.book_id || "") !== session.bookId) {
    return false;
  }
  if (session.sessionIndex !== null && session.sessionIndex !== undefined) {
    const rowSessionIndex = Number(row.session_index || 0);
    if (rowSessionIndex !== session.sessionIndex) {
      return false;
    }
  }
  const rowTitle = String(row.title || "").trim();
  if (rowTitle !== session.title) {
    return false;
  }
  const rowMinutes = roundMinutes(Number(row.minutes || 0));
  if (rowMinutes !== session.minutes) {
    return false;
  }
  return true;
}

export function readFocusSessionFromDataset(
  button: HTMLButtonElement,
): FocusSession | null {
  const title = String(button.dataset.focusSessionTitle || "").trim();
  const date = String(button.dataset.focusSessionDate || "").trim();
  const rawMinutes = Number(button.dataset.focusSessionMinutes || 0);
  const bookId = String(button.dataset.focusSessionBookId || "").trim();
  const rawSessionIndex = Number(button.dataset.focusSessionIndex || 0);
  if (!title || !date || !Number.isFinite(rawMinutes) || rawMinutes <= 0) {
    return null;
  }
  let sessionIndex: number | null = null;
  if (Number.isFinite(rawSessionIndex) && rawSessionIndex > 0) {
    sessionIndex = Math.round(rawSessionIndex);
  }
  return {
    date,
    minutes: roundMinutes(rawMinutes),
    title,
    bookId: bookId || "",
    sessionIndex,
  };
}

export function setFocusEntryButtonState(
  button: HTMLButtonElement,
  isOpen: boolean,
): void {
  if (isOpen) {
    button.textContent = CLOSE_FOCUS_TEXT;
    button.setAttribute("aria-expanded", "true");
    return;
  }
  button.textContent = OPEN_FOCUS_TEXT;
  button.setAttribute("aria-expanded", "false");
}

export function findSessionRow(
  lastResult: PlannerResult | null,
  session: FocusSession | null,
): PlannerScheduleRow | null {
  if (!session) {
    return null;
  }
  const rows = lastResult?.schedule || [];
  for (const row of rows) {
    if (rowMatchesFocusSession(row, session)) {
      return row;
    }
  }
  return null;
}

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

export function tinyStartSessionFromFocus(
  session: FocusSession | null,
): Session {
  const endedAt = new Date().toISOString();
  const startedAt = new Date(
    Date.now() - TINY_START_MINUTES * 60 * 1000,
  ).toISOString();
  return normalizeSession({
    source: "manual",
    book_id: session?.bookId || "",
    title: session?.title || "Tiny Start",
    minutes: TINY_START_MINUTES,
    started_at: startedAt,
    ended_at: endedAt,
    notes: TINY_START_NOTE,
  });
}
