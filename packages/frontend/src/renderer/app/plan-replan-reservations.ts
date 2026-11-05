/**
 * Converts user-owned schedule rows and removal blocks into planner
 * constraints, so a replan fills only the budget the user has not claimed.
 *
 * - Locked and completed rows on or after the planner start reserve their
 *   day's minutes, session slots, and book.
 * - Locked rows that are not complete yet reserve their planned words, so the
 *   planner does not schedule that reading a second time.
 * - Removed day-book pairs keep the book off that day without using a slot.
 */

import type {
    BlockedDayBooks,
    PlannerScheduleRow,
    PlannerSettings,
    ScheduleCompletions,
} from "../../types/types.ts";
import { isScheduleRowCompleted } from "../calendar/utils.ts";
import { isOnOrAfterDay } from "./day_keys_compare.ts";
import {
    blockedBookIdsByDate,
    isLockedRow,
    isUserOwnedRow,
} from "./schedule_user_rows.ts";

// audit-allow-local-types: Private accumulator and inputs for reservation building.
interface DayReservations {
    bookIds: Record<string, string[]>;
    minutes: Record<string, number>;
    sessions: Record<string, number>;
}

interface ReservationArgs {
    blockedDayBooks: BlockedDayBooks;
    completions: ScheduleCompletions;
    previousRows: PlannerScheduleRow[];
    startDayKey: string;
    todayKey: string;
}

/** Adds one kept row's minutes, session slot, and book to its day. */
function addDayReservation(
    totals: DayReservations,
    row: PlannerScheduleRow,
): void {
    const NEXT_TOTALS = totals;
    const DATE = row.date;
    const BOOK_ID = String(row.book_id);
    const BOOK_IDS = NEXT_TOTALS.bookIds[DATE] ?? [];
    if (!BOOK_IDS.includes(BOOK_ID)) {
        BOOK_IDS.push(BOOK_ID);
    }
    NEXT_TOTALS.bookIds[DATE] = BOOK_IDS;
    NEXT_TOTALS.minutes[DATE] =
        (NEXT_TOTALS.minutes[DATE] ?? 0) + Math.max(0, Math.round(row.minutes));
    NEXT_TOTALS.sessions[DATE] = (NEXT_TOTALS.sessions[DATE] ?? 0) + 1;
}

/** Totals per-day reservations for user-owned rows on or after the planner start. */
function dayReservations(args: ReservationArgs): DayReservations {
    const TOTALS: DayReservations = { bookIds: {}, minutes: {}, sessions: {} };
    for (const ROW of args.previousRows) {
        if (
            isOnOrAfterDay(ROW.date, args.startDayKey) &&
            isUserOwnedRow(ROW, args.completions)
        ) {
            addDayReservation(TOTALS, ROW);
        }
    }
    return TOTALS;
}

/** Unfinished locked rows from today on still claim their planned words. */
function reservesWords(
    row: PlannerScheduleRow,
    args: ReservationArgs,
): boolean {
    if (!(isLockedRow(row) && isOnOrAfterDay(row.date, args.todayKey))) {
        return false;
    }
    return !isScheduleRowCompleted(row, args.completions);
}

/** Sums the words each book's unfinished locked rows already claim. */
function reservedWordsByBookId(args: ReservationArgs): Record<string, number> {
    const BY_BOOK: Record<string, number> = {};
    for (const ROW of args.previousRows) {
        if (!reservesWords(ROW, args)) {
            continue;
        }
        const BOOK_ID = String(ROW.book_id);
        const WORDS = Math.max(0, Math.round(Number(ROW.words_planned) || 0));
        BY_BOOK[BOOK_ID] = (BY_BOOK[BOOK_ID] ?? 0) + WORDS;
    }
    return BY_BOOK;
}

type ConstraintMap = Record<string, number> | Record<string, string[]>;

/** Keeps only constraint maps that have at least one entry. */
function nonEmptySettings(
    constraints: Record<string, ConstraintMap>,
): PlannerSettings {
    const SETTINGS: PlannerSettings = {};
    for (const [KEY, VALUE] of Object.entries(constraints)) {
        if (Object.keys(VALUE).length > 0) {
            SETTINGS[KEY] = VALUE;
        }
    }
    return SETTINGS;
}

/**
 * Builds transient planner settings that reserve user-owned schedule state.
 * Empty constraint maps are omitted.
 * @param args - Previous rows, completions, blocks, and date boundaries.
 * @returns Planner settings overrides for the replan.
 */
export function reservationSettings(args: ReservationArgs): PlannerSettings {
    const DAYS = dayReservations(args);
    return nonEmptySettings({
        excluded_book_ids_by_date: blockedBookIdsByDate(
            args.blockedDayBooks,
            args.startDayKey,
        ),
        reserved_book_ids_by_date: DAYS.bookIds,
        reserved_minutes_by_date: DAYS.minutes,
        reserved_sessions_by_date: DAYS.sessions,
        reserved_words_by_book_id: reservedWordsByBookId(args),
    });
}
