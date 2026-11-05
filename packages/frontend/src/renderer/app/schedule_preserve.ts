/**
 * Preserves historical or completed schedule rows while applying replans.
 */

import type {
    MergeScheduleRowsArgs,
    PlannerScheduleRow,
    ScheduleCompletions,
    SchedulePreservationMode,
} from "../../types/types.ts";
import {
    dayBookCompletionKey,
    sessionKeyFor,
    sortRowsByDateAndSession,
} from "../calendar/utils.ts";
import { dayKeyFromDate } from "./date_keys.ts";
import { isOnOrBeforeDay, isValidDayKey } from "./day_keys_compare.ts";
import {
    dayBookKeyForRow,
    hasBlockedBooksOnDay,
    isBlockedRow,
    isUserOwnedRow,
} from "./schedule_user_rows.ts";

const DEFAULT_PRESERVATION_MODE: SchedulePreservationMode = "through_today";

/**
 * Returns schedule rows sorted by day and session index.
 * @param rows - Unsorted schedule rows.
 * @returns New sorted row array.
 */
export function sortedRows(
    rows: PlannerScheduleRow[] = [],
): PlannerScheduleRow[] {
    return sortRowsByDateAndSession(rows);
}

function isPastDay(row: PlannerScheduleRow, todayKey: string): boolean {
    if (row.date === todayKey) {
        return false;
    }
    return isOnOrBeforeDay(row.date, todayKey);
}

// audit-allow-local-types: Private option bags for merge predicates.
interface PreserveRowOptions {
    completions: ScheduleCompletions;
    mode: SchedulePreservationMode;
    row: PlannerScheduleRow;
    todayKey: string;
}

interface AcceptRowOptions {
    args: Required<MergeScheduleRowsArgs>;
    lockToday: boolean;
    occupiedDayBooks: Set<string>;
    row: PlannerScheduleRow;
    todayKey: string;
}

/** Decides whether an existing row survives the replan. */
function preservePreviousRow(options: PreserveRowOptions): boolean {
    if (isPastDay(options.row, options.todayKey)) {
        return true;
    }
    if (isUserOwnedRow(options.row, options.completions)) {
        return true;
    }
    if (options.row.date !== options.todayKey) {
        return false;
    }
    return options.mode === "through_today";
}

/** Decides whether a generated row's date is open for replanning. */
function acceptsPlannedDate(options: AcceptRowOptions): boolean {
    const { row, todayKey } = options;
    if (!isValidDayKey(row.date)) {
        return false;
    }
    if (options.args.preservationMode === "completed_today") {
        return !isPastDay(row, todayKey);
    }
    if (row.date === todayKey) {
        return !options.lockToday;
    }
    return !isOnOrBeforeDay(row.date, todayKey);
}

function acceptPlannedRow(options: AcceptRowOptions): boolean {
    if (!acceptsPlannedDate(options)) {
        return false;
    }
    if (options.occupiedDayBooks.has(dayBookKeyForRow(options.row))) {
        return false;
    }
    return !isBlockedRow(options.args.blockedDayBooks, options.row);
}

function locksToday(
    args: Required<MergeScheduleRowsArgs>,
    todayKey: string,
): boolean {
    if (args.preservationMode !== "through_today") {
        return false;
    }
    if (args.previousRows.some((row) => row.date === todayKey)) {
        return true;
    }
    return hasBlockedBooksOnDay(args.blockedDayBooks, todayKey);
}

function preservedPreviousRows(
    args: Required<MergeScheduleRowsArgs>,
    todayKey: string,
): PlannerScheduleRow[] {
    return args.previousRows.filter((row) =>
        preservePreviousRow({
            completions: args.scheduleCompletions,
            mode: args.preservationMode,
            row,
            todayKey,
        }),
    );
}

function acceptedNextRows(
    args: Required<MergeScheduleRowsArgs>,
    todayKey: string,
    preserved: PlannerScheduleRow[],
): PlannerScheduleRow[] {
    const OCCUPIED_DAY_BOOKS = new Set(preserved.map(dayBookKeyForRow));
    const LOCK_TODAY = locksToday(args, todayKey);
    return args.nextRows.filter((row) =>
        acceptPlannedRow({
            args,
            lockToday: LOCK_TODAY,
            occupiedDayBooks: OCCUPIED_DAY_BOOKS,
            row,
            todayKey,
        }),
    );
}

function mergedRowsByKey(
    args: Required<MergeScheduleRowsArgs>,
): Map<string, PlannerScheduleRow> {
    const TODAY_KEY = dayKeyFromDate(new Date());
    const PRESERVED = preservedPreviousRows(args, TODAY_KEY);
    const MERGED = new Map<string, PlannerScheduleRow>();
    for (const ROW of acceptedNextRows(args, TODAY_KEY, PRESERVED)) {
        MERGED.set(sessionKeyFor(ROW), ROW);
    }
    for (const ROW of PRESERVED) {
        MERGED.set(sessionKeyFor(ROW), ROW);
    }
    return MERGED;
}

function resolvedArgs(
    args: MergeScheduleRowsArgs,
): Required<MergeScheduleRowsArgs> {
    return {
        blockedDayBooks: args.blockedDayBooks ?? {},
        nextRows: args.nextRows ?? [],
        preservationMode: args.preservationMode ?? DEFAULT_PRESERVATION_MODE,
        previousRows: args.previousRows ?? [],
        scheduleCompletions: args.scheduleCompletions ?? {},
    };
}

/**
 * Merges generated rows with schedule history selected by the replan policy.
 * Past rows and user-owned rows (locked or completed) always survive.
 * Automatic runs also retain all of today, while an explicit Today replan
 * retains only today's user-owned sessions. A generated row is dropped when
 * its book already has a kept session that day, so each book has at most one
 * session per day, or when the user removed that book from that day.
 * @param args - Existing rows, generated rows, completion state, and policy.
 * @returns Sorted merged rows with preserved rows winning identity conflicts.
 */
export function mergeScheduleRows(
    args: MergeScheduleRowsArgs = {},
): PlannerScheduleRow[] {
    return sortedRows([...mergedRowsByKey(resolvedArgs(args)).values()]);
}

/**
 * Removes completion entries that no longer map to the current schedule.
 * @param scheduleCompletions - Existing exact or legacy completion flags.
 * @param rows - Current schedule rows.
 * @returns Completion state restricted to existing rows.
 */
export function pruneScheduleCompletions(
    scheduleCompletions: Record<string, boolean> = {},
    rows: PlannerScheduleRow[] = [],
): Record<string, boolean> {
    const ALLOWED_KEYS = new Set<string>();
    for (const ROW of rows) {
        ALLOWED_KEYS.add(sessionKeyFor(ROW));
        ALLOWED_KEYS.add(dayBookCompletionKey(ROW.date, String(ROW.book_id)));
    }
    const OUTPUT: Record<string, boolean> = {};
    for (const [KEY, VALUE] of Object.entries(scheduleCompletions)) {
        if (ALLOWED_KEYS.has(KEY)) {
            OUTPUT[KEY] = Boolean(VALUE);
        }
    }
    return OUTPUT;
}
