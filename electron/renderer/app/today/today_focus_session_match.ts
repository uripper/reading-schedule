import type {
  PlannerResult,
  PlannerScheduleRow,
  FocusSession,
} from "../../../types/types.js";

const MINUTES_MIN = 1;

/**
 * Normalizes minute values to a positive rounded integer.
 * @param value Raw minute value.
 * @returns Rounded minute value with minimum of 1.
 */
function roundMinutes(value: number): number {
  return Math.max(MINUTES_MIN, Math.round(value));
}

/**
 * Checks whether a row date matches focus-session date.
 * @param row Planned schedule row.
 * @param session Focus session metadata.
 * @returns True when row date equals focus-session date.
 */
function rowMatchesDate(
  row: PlannerScheduleRow,
  session: FocusSession,
): boolean {
  return String(row.date || "") === session.date;
}

/**
 * Checks whether a row book id matches focus-session book id.
 * @param row Planned schedule row.
 * @param session Focus session metadata.
 * @returns True when book ids match, or when focus session has no book id.
 */
function rowMatchesBook(
  row: PlannerScheduleRow,
  session: FocusSession,
): boolean {
  if (!session.bookId) {
    return true;
  }
  return String(row.book_id || "") === session.bookId;
}

/**
 * Checks whether a row session index matches focus-session session index.
 * @param row Planned schedule row.
 * @param session Focus session metadata.
 * @returns True when indices match, or when focus session index is unspecified.
 */
function rowMatchesSessionIndex(
  row: PlannerScheduleRow,
  session: FocusSession,
): boolean {
  if (session.sessionIndex === null) {
    return true;
  }
  const rowSessionIndex = Number(row.session_index || 0);
  return rowSessionIndex === session.sessionIndex;
}

/**
 * Checks whether a row title matches focus-session title.
 * @param row Planned schedule row.
 * @param session Focus session metadata.
 * @returns True when titles match exactly after row-title trimming.
 */
function rowMatchesTitle(
  row: PlannerScheduleRow,
  session: FocusSession,
): boolean {
  const rowTitle = String(row.title || "").trim();
  return rowTitle === session.title;
}

/**
 * Checks whether a row minute count matches focus-session minutes.
 * @param row Planned schedule row.
 * @param session Focus session metadata.
 * @returns True when rounded minute values match.
 */
function rowMatchesMinutes(
  row: PlannerScheduleRow,
  session: FocusSession,
): boolean {
  const rowMinutes = roundMinutes(Number(row.minutes || 0));
  return rowMinutes === session.minutes;
}

/**
 * Checks whether a schedule row fully matches a focus-session descriptor.
 * @param row Planned schedule row.
 * @param session Focus session metadata.
 * @returns True when date/book/index/title/minutes all match.
 */
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

/**
 * Parses a numeric input as a strictly positive finite number.
 * @param value Numeric candidate.
 * @returns Parsed number or null when invalid/non-positive.
 */
function parsedPositiveFinite(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

/**
 * Converts a numeric value into a positive session index or null.
 * @param value Numeric candidate.
 * @returns Rounded session index, or null when invalid.
 */
function sessionIndexOrNull(value: number): number | null {
  const parsed = parsedPositiveFinite(value);
  if (parsed === null) {
    return null;
  }
  return Math.round(parsed);
}

/**
 * Reads focus-session metadata from today button dataset attributes.
 * @param button Focus entry button carrying dataset fields.
 * @returns Parsed focus session, or null when required fields are missing.
 */
export function readFocusSessionFromDataset(
  button: HTMLButtonElement,
): FocusSession | null {
  const title = String(button.dataset.focusSessionTitle ?? "").trim();
  const date = String(button.dataset.focusSessionDate ?? "").trim();
  const parsedMinutes = parsedPositiveFinite(
    Number(button.dataset.focusSessionMinutes ?? 0),
  );
  const bookId = String(button.dataset.focusSessionBookId ?? "").trim();
  const rawSessionIndex = Number(button.dataset.focusSessionIndex ?? 0);
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

/**
 * Finds the planned row that corresponds to the provided focus session.
 * @param lastResult Latest planner result.
 * @param session Focus session metadata.
 * @returns Matching schedule row, or null when none matches.
 */
export function findSessionRow(
  lastResult: PlannerResult | null,
  session: FocusSession | null,
): PlannerScheduleRow | null {
  if (!session) {
    return null;
  }
  const rows = lastResult?.schedule ?? [];
  for (const row of rows) {
    if (rowMatchesFocusSession(row, session)) {
      return row;
    }
  }
  return null;
}
