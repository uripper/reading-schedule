import {
    type FocusSession,
    type PlannerResult,
    type PlannerScheduleRow,
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
    const ROW_SESSION_INDEX = Number(row.session_index || 0);
    return ROW_SESSION_INDEX === session.sessionIndex;
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
    const ROW_TITLE = String(row.title || "").trim();
    return ROW_TITLE === session.title;
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
    const ROW_MINUTES = roundMinutes(Number(row.minutes || 0));
    return ROW_MINUTES === session.minutes;
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
    const DATE_MATCHES = rowMatchesDate(row, session);
    const BOOK_MATCHES = rowMatchesBook(row, session);
    const SESSION_INDEX_MATCHES = rowMatchesSessionIndex(row, session);
    if (!DATE_MATCHES || !BOOK_MATCHES || !SESSION_INDEX_MATCHES) {
        return false;
    }
    const TITLE_MATCHES = rowMatchesTitle(row, session);
    const MINUTES_MATCH = rowMatchesMinutes(row, session);
    return TITLE_MATCHES && MINUTES_MATCH;
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
    const PARSED = parsedPositiveFinite(value);
    if (PARSED === null) {
        return null;
    }
    return Math.round(PARSED);
}

/**
 * Reads focus-session metadata from today button dataset attributes.
 * @param button Focus entry button carrying dataset fields.
 * @returns Parsed focus session, or null when required fields are missing.
 */
export function readFocusSessionFromDataset(
    button: HTMLButtonElement,
): FocusSession | null {
    const TITLE = String(button.dataset.focusSessionTitle ?? "").trim();
    const DATE = String(button.dataset.focusSessionDate ?? "").trim();
    const PARSED_MINUTES = parsedPositiveFinite(
        Number(button.dataset.focusSessionMinutes ?? 0),
    );
    const BOOK_ID = String(button.dataset.focusSessionBookId ?? "").trim();
    const RAW_SESSION_INDEX = Number(button.dataset.focusSessionIndex ?? 0);
    if (!TITLE || !DATE || PARSED_MINUTES === null) {
        return null;
    }
    return {
        bookId: BOOK_ID || "",
        date: DATE,
        minutes: roundMinutes(PARSED_MINUTES),
        sessionIndex: sessionIndexOrNull(RAW_SESSION_INDEX),
        title: TITLE,
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
    const ROWS = lastResult?.schedule ?? [];
    for (const ROW of ROWS) {
        if (rowMatchesFocusSession(ROW, session)) {
            return ROW;
        }
    }
    return null;
}
