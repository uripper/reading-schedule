import type { PlannerScheduleRow, Session } from "../../types/types.js";
import { dayKeyFromDate, localDayKeyFromIso } from "./date_keys.js";
import { isOnOrBeforeDay, isValidDayKey } from "./day_keys_compare.js";

const SESSION_INDEX_PAD = 3;

/**
 * Builds a sortable key for stable schedule ordering by day and session index.
 * @param row Planner schedule row.
 * @returns Lexicographic key used for deterministic row sorting.
 */
function rowSortKey(row: PlannerScheduleRow): string {
    const SESSION = String(row.session_index || 0).padStart(
        SESSION_INDEX_PAD,
        "0",
    );
    return `${String(row.date || "")}-${SESSION}`;
}

/**
 * Returns schedule rows sorted by day and session index.
 * @param rows Unsanitized schedule rows.
 * @returns New sorted row array.
 */
function sortedRows(rows: PlannerScheduleRow[] = []): PlannerScheduleRow[] {
    return [...rows].sort((left, right) => {
        return rowSortKey(left).localeCompare(rowSortKey(right));
    });
}

/**
 * Computes days that should remain fixed when regenerating schedules.
 * A day is locked when it already exists in the prior plan and is today/past,
 * or when an ended session occurred on that day.
 * @param previousRows Previously planned rows.
 * @param sessions Recorded reading sessions.
 * @returns Set of locked day keys.
 */
function lockedDates(
    previousRows: PlannerScheduleRow[] = [],
    sessions: Session[] = [],
): Set<string> {
    const LOCKED = new Set<string>();
    const PREVIOUS_DATES = new Set<string>();
    const TODAY_KEY = dayKeyFromDate(new Date());

    previousRows.forEach((row) => {
        const ROW_DATE = String(row.date || "");
        if (!isValidDayKey(ROW_DATE)) {
            return;
        }
        PREVIOUS_DATES.add(ROW_DATE);
        if (isOnOrBeforeDay(ROW_DATE, TODAY_KEY)) {
            LOCKED.add(ROW_DATE);
        }
    });

    sessions.forEach((session) => {
        const ENDED_AT = String(session.ended_at || "");
        const KEY = localDayKeyFromIso(ENDED_AT);
        if (!isValidDayKey(KEY || "")) {
            return;
        }
        if (PREVIOUS_DATES.has(KEY) && isOnOrBeforeDay(KEY, TODAY_KEY)) {
            LOCKED.add(KEY);
        }
    });

    return LOCKED;
}

/**
 * Builds a completion key scoped to exact schedule row identity.
 * @param row Planner schedule row.
 * @returns Key combining date, session index, and book id.
 */
function scheduleKey(row: PlannerScheduleRow): string {
    return `${row.date}|${row.session_index}|${row.book_id}`;
}

/**
 * Builds a completion key scoped to day and book only.
 * @param row Planner schedule row.
 * @returns Key combining date and book id.
 */
function dayBookCompletionKey(row: PlannerScheduleRow): string {
    return `${row.date}|${row.book_id}`;
}

/**
 * Removes rows whose day-book key has been manually blocked by the user.
 * @param rows Candidate schedule rows.
 * @param blockedDayBooks Block map keyed by `YYYY-MM-DD|book_id`.
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
 * @param previousRows Previous schedule rows.
 * @param nextRows Newly generated schedule rows.
 * @param sessions Recorded reading sessions used to infer locked days.
 * @param blockedDayBooks Manually blocked day-book keys to exclude from replans.
 * @returns Sorted merged schedule rows with duplicate keys removed.
 */
export function mergeScheduleRows(
    previousRows: PlannerScheduleRow[] = [],
    nextRows: PlannerScheduleRow[] = [],
    sessions: Session[] = [],
    blockedDayBooks: Record<string, boolean> = {},
): PlannerScheduleRow[] {
    const FILTERED_NEXT_ROWS = rowsWithoutBlockedDayBooks(
        nextRows,
        blockedDayBooks,
    );
    const LOCKED = lockedDates(previousRows, sessions);
    if (!LOCKED.size) {
        return sortedRows(FILTERED_NEXT_ROWS);
    }

    const KEPT_ROWS = previousRows.filter((row) => {
        return LOCKED.has(String(row.date || ""));
    });
    const NEW_ROWS = FILTERED_NEXT_ROWS.filter((row) => {
        return !LOCKED.has(String(row.date || ""));
    });

    const MERGED_BY_KEY = new Map<string, PlannerScheduleRow>();

    for (const ROW of [...KEPT_ROWS, ...NEW_ROWS]) {
        MERGED_BY_KEY.set(scheduleKey(ROW), ROW);
    }

    return sortedRows([...MERGED_BY_KEY.values()]);
}

/**
 * Removes completion entries that no longer map to rows in the current schedule.
 * Supports both full session keys and day-book aggregate keys.
 * @param scheduleCompletions Existing completion map.
 * @param rows Current schedule rows.
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

    Object.entries(scheduleCompletions).forEach(([key, value]) => {
        if (!ALLOWED_SESSION_KEYS.has(key) && !ALLOWED_DAY_BOOK_KEYS.has(key)) {
            return;
        }
        OUT[key] = Boolean(value);
    });
    return OUT;
}
