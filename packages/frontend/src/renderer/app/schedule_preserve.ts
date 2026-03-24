import type { PlannerScheduleRow, Session } from "../../types/types.ts";
import { dayKeyFromDate, localDayKeyFromIso } from "./date_keys.ts";
import { isOnOrBeforeDay, isValidDayKey } from "./day_keys_compare.ts";

const SESSION_INDEX_PAD = 3;

type MergeScheduleRowsArgs = {
    previousRows?: PlannerScheduleRow[];
    nextRows?: PlannerScheduleRow[];
    sessions?: Session[];
    blockedDayBooks?: Record<string, boolean>;
};

type LockedDateState = {
    locked: Set<string>;
    previousDates: Set<string>;
};

/**
 * Builds a sortable key for stable schedule ordering by day and session index.
 * @param row - Planner schedule row.
 * @returns Lexicographic key used for deterministic row sorting.
 */
function rowSortKey(row: PlannerScheduleRow): string {
    const SESSION = String(row.session_index || 0).padStart(
        SESSION_INDEX_PAD,
        "0",
    );
    return `${String(row.date || "")}-${SESSION}`;
}

function validDayKey(value: string): string | null {
    if (!isValidDayKey(value)) {
        return null;
    }
    return value;
}

function rowDayKey(row: PlannerScheduleRow): string | null {
    return validDayKey(String(row.date || ""));
}

function sessionDayKey(session: Session): string | null {
    const KEY = localDayKeyFromIso(String(session.ended_at || "")) ?? "";
    return validDayKey(KEY);
}

/**
 * Returns schedule rows sorted by day and session index.
 * @param rows - Unsanitized schedule rows.
 * @returns New sorted row array.
 */
export function sortedRows(
    rows: PlannerScheduleRow[] = [],
): PlannerScheduleRow[] {
    return [...rows].sort((left, right) => {
        return rowSortKey(left).localeCompare(rowSortKey(right));
    });
}

/**
 * Computes days that should remain fixed when regenerating schedules.
 * A day is locked when it already exists in the prior plan and is today/past,
 * or when an ended session occurred on that day.
 * @param previousRows - Previously planned rows.
 * @param sessions - Recorded reading sessions.
 * @returns Set of locked day keys.
 */
function lockedDates(
    previousRows: PlannerScheduleRow[] = [],
    sessions: Session[] = [],
): Set<string> {
    const TODAY_KEY = dayKeyFromDate(new Date());
    const STATE = previousLockedDates(previousRows, TODAY_KEY);
    addLockedSessionDates({
        sessions,
        state: STATE,
        todayKey: TODAY_KEY,
    });
    return STATE.locked;
}

function previousLockedDates(
    previousRows: PlannerScheduleRow[],
    todayKey: string,
): LockedDateState {
    const PREVIOUS_DATES = new Set<string>();
    collectPreviousDates(previousRows, PREVIOUS_DATES);
    return {
        locked: lockedPreviousDates(PREVIOUS_DATES, todayKey),
        previousDates: PREVIOUS_DATES,
    };
}

function collectPreviousDates(
    previousRows: PlannerScheduleRow[],
    previousDates: Set<string>,
): void {
    for (const ROW of previousRows) {
        const ROW_DATE = rowDayKey(ROW);
        if (ROW_DATE !== null) {
            previousDates.add(ROW_DATE);
        }
    }
}

function lockedPreviousDates(
    previousDates: Set<string>,
    todayKey: string,
): Set<string> {
    const LOCKED = new Set<string>();
    for (const PREVIOUS_DATE of previousDates) {
        if (isOnOrBeforeDay(PREVIOUS_DATE, todayKey)) {
            LOCKED.add(PREVIOUS_DATE);
        }
    }
    return LOCKED;
}

function addLockedSessionDates(args: {
    sessions: Session[];
    state: LockedDateState;
    todayKey: string;
}): void {
    for (const SESSION of args.sessions) {
        addLockedSessionDate(SESSION, args.state, args.todayKey);
    }
}

function shouldLockSessionDate(
    key: string | null,
    state: LockedDateState,
    todayKey: string,
): key is string {
    if (key === null) {
        return false;
    }
    if (!state.previousDates.has(key)) {
        return false;
    }
    return isOnOrBeforeDay(key, todayKey);
}

function addLockedSessionDate(
    session: Session,
    state: LockedDateState,
    todayKey: string,
): void {
    const KEY = sessionDayKey(session);
    if (!shouldLockSessionDate(KEY, state, todayKey)) {
        return;
    }
    state.locked.add(KEY);
}

/**
 * Builds a completion key scoped to exact schedule row identity.
 * @param row - Planner schedule row.
 * @returns Key combining date, session index, and book id.
 */
function scheduleKey(row: PlannerScheduleRow): string {
    return `${row.date}|${row.session_index}|${row.book_id}`;
}

/**
 * Builds a completion key scoped to day and book only.
 * @param row - Planner schedule row.
 * @returns Key combining date and book id.
 */
function dayBookCompletionKey(row: PlannerScheduleRow): string {
    return `${row.date}|${row.book_id}`;
}

/**
 * Removes rows whose day-book key has been manually blocked by the user.
 * @param rows - Candidate schedule rows.
 * @param blockedDayBooks - Block map keyed by `YYYY-MM-DD|book_id`.
 * @returns Rows that are still allowed for scheduling.
 */
function rowsWithoutBlockedDayBooks(
    rows: PlannerScheduleRow[],
    blockedDayBooks: Record<string, boolean>,
): PlannerScheduleRow[] {
    return rows.filter((row) => {
        const KEY = dayBookCompletionKey(row);
        return !blockedDayBooks[KEY];
    });
}

/**
 * Merges new plan rows with locked rows from the previous plan.
 * Locked days are preserved from `previousRows`; other days come from `nextRows`.
 * @param args - Previous rows, new rows, sessions, and blocked day-book keys.
 * @returns Sorted merged schedule rows with duplicate keys removed.
 */
export function mergeScheduleRows(
    args: MergeScheduleRowsArgs = {},
): PlannerScheduleRow[] {
    const INPUTS = mergeScheduleRowsInputs(args);
    const LOCKED = lockedDates(INPUTS.previousRows, INPUTS.sessions);
    if (!LOCKED.size) {
        return sortedRows(INPUTS.nextRows);
    }
    return sortedRows([
        ...mergedRowsByKey(
            INPUTS.previousRows,
            INPUTS.nextRows,
            LOCKED,
        ).values(),
    ]);
}

function mergeScheduleRowsInputs(
    args: MergeScheduleRowsArgs,
): Required<MergeScheduleRowsArgs> {
    const BLOCKED_DAY_BOOKS = resolvedBlockedDayBooks(args.blockedDayBooks);
    return {
        blockedDayBooks: BLOCKED_DAY_BOOKS,
        nextRows: rowsWithoutBlockedDayBooks(
            resolvedScheduleRows(args.nextRows),
            BLOCKED_DAY_BOOKS,
        ),
        previousRows: resolvedScheduleRows(args.previousRows),
        sessions: resolvedSessions(args.sessions),
    };
}

function resolvedScheduleRows(
    rows: PlannerScheduleRow[] | undefined,
): PlannerScheduleRow[] {
    if (rows === undefined) {
        return [];
    }
    return rows;
}

function resolvedSessions(sessions: Session[] | undefined): Session[] {
    if (sessions === undefined) {
        return [];
    }
    return sessions;
}

function resolvedBlockedDayBooks(
    blockedDayBooks: Record<string, boolean> | undefined,
): Record<string, boolean> {
    if (blockedDayBooks === undefined) {
        return {};
    }
    return blockedDayBooks;
}

function mergedRowsByKey(
    previousRows: PlannerScheduleRow[],
    nextRows: PlannerScheduleRow[],
    locked: Set<string>,
): Map<string, PlannerScheduleRow> {
    const MERGED_BY_KEY = new Map<string, PlannerScheduleRow>();
    appendMergedRows({
        keepLocked: true,
        locked,
        mergedByKey: MERGED_BY_KEY,
        rows: previousRows,
    });
    appendMergedRows({
        keepLocked: false,
        locked,
        mergedByKey: MERGED_BY_KEY,
        rows: nextRows,
    });
    return MERGED_BY_KEY;
}

function appendMergedRows(args: {
    mergedByKey: Map<string, PlannerScheduleRow>;
    rows: PlannerScheduleRow[];
    locked: Set<string>;
    keepLocked: boolean;
}): void {
    for (const ROW of args.rows) {
        if (shouldSkipMergedRow(ROW, args.locked, args.keepLocked)) {
            continue;
        }
        args.mergedByKey.set(scheduleKey(ROW), ROW);
    }
}

function shouldSkipMergedRow(
    row: PlannerScheduleRow,
    locked: Set<string>,
    keepLocked: boolean,
): boolean {
    const IS_LOCKED = locked.has(String(row.date || ""));
    if (keepLocked) {
        return !IS_LOCKED;
    }
    return IS_LOCKED;
}

/**
 * Removes completion entries that no longer map to rows in the current schedule.
 * Supports both full session keys and day-book aggregate keys.
 * @param scheduleCompletions - Existing completion map.
 * @param rows - Current schedule rows.
 * @returns Pruned completion map containing only valid keys.
 */
export function pruneScheduleCompletions(
    scheduleCompletions: Record<string, boolean> = {},
    rows: PlannerScheduleRow[] = [],
): Record<string, boolean> {
    const ALLOWED_SESSION_KEYS = new Set(rows.map((row) => scheduleKey(row)));
    const ALLOWED_DAY_BOOK_KEYS = new Set(
        rows.map((row) => dayBookCompletionKey(row)),
    );
    const OUT: Record<string, boolean> = {};
    for (const [KEY, VALUE] of Object.entries(scheduleCompletions)) {
        if (
            !(ALLOWED_SESSION_KEYS.has(KEY) || ALLOWED_DAY_BOOK_KEYS.has(KEY))
        ) {
            continue;
        }
        OUT[KEY] = Boolean(VALUE);
    }
    return OUT;
}
