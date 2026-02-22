import type { FocusSession } from "./today_focus.js";
import type { PlannerResult, PlannerScheduleRow } from "./types.js";

const MINUTES_MIN = 1;

function roundMinutes(value: number): number {
  return Math.max(MINUTES_MIN, Math.round(value));
}

function rowMatchesDate(row: PlannerScheduleRow, session: FocusSession): boolean {
  return String(row.date || "") === session.date;
}

function rowMatchesBook(row: PlannerScheduleRow, session: FocusSession): boolean {
  if (!session.bookId) {
    return true;
  }
  return String(row.book_id || "") === session.bookId;
}

function rowMatchesSessionIndex(
  row: PlannerScheduleRow,
  session: FocusSession,
): boolean {
  if (session.sessionIndex === null || session.sessionIndex === undefined) {
    return true;
  }
  const rowSessionIndex = Number(row.session_index || 0);
  return rowSessionIndex === session.sessionIndex;
}

function rowMatchesTitle(row: PlannerScheduleRow, session: FocusSession): boolean {
  const rowTitle = String(row.title || "").trim();
  return rowTitle === session.title;
}

function rowMatchesMinutes(row: PlannerScheduleRow, session: FocusSession): boolean {
  const rowMinutes = roundMinutes(Number(row.minutes || 0));
  return rowMinutes === session.minutes;
}

function rowMatchesFocusSession(
  row: PlannerScheduleRow,
  session: FocusSession,
): boolean {
  return (
    rowMatchesDate(row, session) &&
    rowMatchesBook(row, session) &&
    rowMatchesSessionIndex(row, session) &&
    rowMatchesTitle(row, session) &&
    rowMatchesMinutes(row, session)
  );
}

function parsedPositiveFinite(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function sessionIndexOrNull(value: number): number | null {
  const parsed = parsedPositiveFinite(value);
  if (parsed === null) {
    return null;
  }
  return Math.round(parsed);
}

export function readFocusSessionFromDataset(
  button: HTMLButtonElement,
): FocusSession | null {
  const title = String(button.dataset.focusSessionTitle || "").trim();
  const date = String(button.dataset.focusSessionDate || "").trim();
  const parsedMinutes = parsedPositiveFinite(
    Number(button.dataset.focusSessionMinutes || 0),
  );
  const bookId = String(button.dataset.focusSessionBookId || "").trim();
  const rawSessionIndex = Number(button.dataset.focusSessionIndex || 0);
  if (!title || !date || parsedMinutes === null) {
    return null;
  }
  return {
    date,
    title,
    sessionIndex: sessionIndexOrNull(rawSessionIndex),
    bookId: bookId || "",
    minutes: roundMinutes(parsedMinutes),
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
