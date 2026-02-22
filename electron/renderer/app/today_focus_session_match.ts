import type { FocusSession } from "./today_focus.js";
import type { PlannerResult, PlannerScheduleRow } from "./types.js";

const MINUTES_MIN = 1;

function roundMinutes(value: number): number {
  return Math.max(MINUTES_MIN, Math.round(value));
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
    title,
    sessionIndex,
    bookId: bookId || "",
    minutes: roundMinutes(rawMinutes),
  };
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
