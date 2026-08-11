/**
 * Preserves historical or completed schedule rows while applying replans.
 */

import type {
    MergeScheduleRowsArgs,
    PlannerScheduleRow,
    SchedulePreservationMode,
} from "../../types/types.ts";
import {
    dayBookCompletionKey,
    isScheduleRowCompleted,
    sessionKeyFor,
    sortRowsByDateAndSession,
} from "../calendar/utils.ts";
import { dayKeyFromDate } from "./date_keys.ts";
import { isOnOrBeforeDay, isValidDayKey } from "./day_keys_compare.ts";

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

function preservePreviousRow(options: {
    completions: Record<string, boolean>;
    mode: SchedulePreservationMode;
    row: PlannerScheduleRow;
    todayKey: string;
}): boolean {
    if (isPastDay(options.row, options.todayKey)) {
        return true;
    }
    if (options.row.date !== options.todayKey) {
        return false;
    }
    if (options.mode === "through_today") {
        return true;
    }
    return isScheduleRowCompleted(options.row, options.completions);
}

function acceptPlannedRow(options: {
    blockedDayBooks: Record<string, boolean>;
    lockToday: boolean;
    mode: SchedulePreservationMode;
    row: PlannerScheduleRow;
    todayKey: string;
}): boolean {
    if (!isValidDayKey(options.row.date)) {
        return false;
    }
    const BLOCK_KEY = dayBookCompletionKey(
        options.row.date,
        String(options.row.book_id),
    );
    if (options.blockedDayBooks[BLOCK_KEY] === true) {
        return false;
    }
    if (options.mode === "completed_today") {
        return !isPastDay(options.row, options.todayKey);
    }
    if (options.row.date === options.todayKey) {
        return !options.lockToday;
    }
    return !isOnOrBeforeDay(options.row.date, options.todayKey);
}

function appendAcceptedNextRows(
    args: Required<MergeScheduleRowsArgs>,
    todayKey: string,
    merged: Map<string, PlannerScheduleRow>,
): void {
    const LOCK_TODAY = locksToday(args, todayKey);
    for (const ROW of args.nextRows) {
        if (
            acceptPlannedRow({
                blockedDayBooks: args.blockedDayBooks,
                lockToday: LOCK_TODAY,
                mode: args.preservationMode,
                row: ROW,
                todayKey,
            })
        ) {
            merged.set(sessionKeyFor(ROW), ROW);
        }
    }
}

function locksToday(
    args: Required<MergeScheduleRowsArgs>,
    todayKey: string,
): boolean {
    if (args.preservationMode !== "through_today") {
        return false;
    }
    return args.previousRows.some((row) => row.date === todayKey);
}

function appendPreservedPreviousRows(
    args: Required<MergeScheduleRowsArgs>,
    todayKey: string,
    merged: Map<string, PlannerScheduleRow>,
): void {
    for (const ROW of args.previousRows) {
        if (
            preservePreviousRow({
                completions: args.scheduleCompletions,
                mode: args.preservationMode,
                row: ROW,
                todayKey,
            })
        ) {
            merged.set(sessionKeyFor(ROW), ROW);
        }
    }
}

function mergedRowsByKey(
    args: Required<MergeScheduleRowsArgs>,
): Map<string, PlannerScheduleRow> {
    const TODAY_KEY = dayKeyFromDate(new Date());
    const MERGED = new Map<string, PlannerScheduleRow>();
    appendAcceptedNextRows(args, TODAY_KEY, MERGED);
    appendPreservedPreviousRows(args, TODAY_KEY, MERGED);
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
 * Past rows always survive. Automatic runs retain all of today, while an
 * explicit Today replan retains only completed sessions from today.
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
