/**
 * Identifies schedule rows and day-book blocks that express user intent.
 *
 * A row is user-owned when the user added or edited it (`locked`) or marked
 * it complete. Replans keep user-owned rows on their day and plan around
 * them. A blocked day-book pair records a removal: the planner must not put
 * that book back on that day until the user adds it again.
 */

import type {
    BlockedDayBooks,
    PlannerScheduleRow,
    ScheduleCompletions,
} from "../../types/types.ts";
import {
    dayBookCompletionKey,
    isScheduleRowCompleted,
} from "../calendar/utils.ts";
import { isOnOrAfterDay, isValidDayKey } from "./day_keys_compare.ts";

const DAY_BOOK_KEY_SEPARATOR = "|";

/**
 * Checks whether the user added or edited a schedule row.
 * @param row - Schedule row.
 * @returns True when the row is locked to its day.
 */
export function isLockedRow(row: PlannerScheduleRow): boolean {
    return row.locked === true;
}

/**
 * Checks whether a row reflects user intent that replans must keep.
 * @param row - Schedule row.
 * @param completions - Completion flags keyed by schedule identity.
 * @returns True for valid-day rows that are locked or completed.
 */
export function isUserOwnedRow(
    row: PlannerScheduleRow,
    completions: ScheduleCompletions,
): boolean {
    if (!isValidDayKey(row.date)) {
        return false;
    }
    return isLockedRow(row) || isScheduleRowCompleted(row, completions);
}

/**
 * Builds the day-book identity used for one-session-per-book-per-day rules.
 * @param row - Schedule row.
 * @returns Day-book key for the row.
 */
export function dayBookKeyForRow(row: PlannerScheduleRow): string {
    return dayBookCompletionKey(row.date, String(row.book_id));
}

/**
 * Checks whether the user removed this book from this row's day.
 * @param blockedDayBooks - Persisted day-book removal blocks.
 * @param row - Candidate schedule row.
 * @returns True when the row's day-book pair is blocked.
 */
export function isBlockedRow(
    blockedDayBooks: BlockedDayBooks,
    row: PlannerScheduleRow,
): boolean {
    return blockedDayBooks[dayBookKeyForRow(row)] === true;
}

/**
 * Checks whether any book was removed from a given day.
 * @param blockedDayBooks - Persisted day-book removal blocks.
 * @param dayKey - Day to inspect.
 * @returns True when at least one block exists for the day.
 */
export function hasBlockedBooksOnDay(
    blockedDayBooks: BlockedDayBooks,
    dayKey: string,
): boolean {
    const PREFIX = `${dayKey}${DAY_BOOK_KEY_SEPARATOR}`;
    return Object.entries(blockedDayBooks).some(
        ([key, blocked]) => blocked && key.startsWith(PREFIX),
    );
}

/** Splits an active `date|bookId` block key, or returns null when invalid. */
function parsedBlockedKey(
    key: string,
    blocked: boolean,
): [string, string] | null {
    if (!blocked) {
        return null;
    }
    const SEPARATOR_INDEX = key.indexOf(DAY_BOOK_KEY_SEPARATOR);
    if (SEPARATOR_INDEX <= 0) {
        return null;
    }
    const DATE = key.slice(0, SEPARATOR_INDEX);
    const BOOK_ID = key.slice(SEPARATOR_INDEX + 1);
    if (!(isValidDayKey(DATE) && BOOK_ID)) {
        return null;
    }
    return [DATE, BOOK_ID];
}

/**
 * Groups removal blocks by day for the planner, starting at a given day.
 * @param blockedDayBooks - Persisted day-book removal blocks.
 * @param fromDayKey - First day the planner will schedule.
 * @returns Blocked book IDs keyed by day.
 */
export function blockedBookIdsByDate(
    blockedDayBooks: BlockedDayBooks,
    fromDayKey: string,
): Record<string, string[]> {
    const BY_DATE: Record<string, string[]> = {};
    for (const [KEY, BLOCKED] of Object.entries(blockedDayBooks)) {
        const PARSED = parsedBlockedKey(KEY, BLOCKED);
        if (PARSED === null || !isOnOrAfterDay(PARSED[0], fromDayKey)) {
            continue;
        }
        const [DATE, BOOK_ID] = PARSED;
        BY_DATE[DATE] ??= [];
        BY_DATE[DATE].push(BOOK_ID);
    }
    return BY_DATE;
}
