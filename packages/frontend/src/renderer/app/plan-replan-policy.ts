/**
 * Selects date preservation and consumed-capacity constraints for replans.
 */

import type {
    BlockedDayBooks,
    PlannerScheduleRow,
    ReplanPolicy,
    ReplanPolicyArgs,
} from "../../types/types.ts";
import { nextDayKey, todayDayKey } from "./date_keys.ts";
import { reservationSettings } from "./plan-replan-reservations.ts";
import { hasBlockedBooksOnDay } from "./schedule_user_rows.ts";

const AUTOMATIC_SUCCESS_MESSAGE = "Schedule Updated";
const TODAY_SUCCESS_MESSAGE = "Today Replanned";

/**
 * Today is settled once it has sessions or the user removed a book from it,
 * so automatic replans leave it alone and start tomorrow.
 * @param previousRows - Existing schedule rows.
 * @param blockedDayBooks - Persisted day-book removal blocks.
 * @param todayKey - Current day key.
 * @returns True when automatic replans must not change today.
 */
function todayIsSettled(
    previousRows: PlannerScheduleRow[],
    blockedDayBooks: BlockedDayBooks,
    todayKey: string,
): boolean {
    if (previousRows.some((row) => row.date === todayKey)) {
        return true;
    }
    return hasBlockedBooksOnDay(blockedDayBooks, todayKey);
}

/** Picks the first day the planner may schedule for this replan. */
function minimumStartDate(
    args: ReplanPolicyArgs,
    blockedDayBooks: BlockedDayBooks,
    todayKey: string,
): string {
    if (args.explicitToday) {
        return todayKey;
    }
    if (todayIsSettled(args.previousRows, blockedDayBooks, todayKey)) {
        return nextDayKey(todayKey);
    }
    return todayKey;
}

/**
 * Builds the effective policy for an automatic or explicit Today replan.
 * Both kinds reserve capacity for user-owned sessions on or after the
 * planner start and keep removed books off their days.
 * @param args - Existing schedule, completions, blocks, and replan scope.
 * @returns Date boundary, preservation mode, and transient planner settings.
 */
export function replanPolicy(args: ReplanPolicyArgs): ReplanPolicy {
    const TODAY_KEY = args.todayKey ?? todayDayKey();
    const BLOCKED_DAY_BOOKS = args.blockedDayBooks ?? {};
    const START_DAY_KEY = minimumStartDate(args, BLOCKED_DAY_BOOKS, TODAY_KEY);
    const SETTINGS_OVERRIDES = reservationSettings({
        blockedDayBooks: BLOCKED_DAY_BOOKS,
        completions: args.completions,
        previousRows: args.previousRows,
        startDayKey: START_DAY_KEY,
        todayKey: TODAY_KEY,
    });
    if (!args.explicitToday) {
        return {
            minimumStartDate: START_DAY_KEY,
            preservationMode: "through_today",
            settingsOverrides: SETTINGS_OVERRIDES,
            statusSuccessMessage: AUTOMATIC_SUCCESS_MESSAGE,
        };
    }
    return {
        minimumStartDate: START_DAY_KEY,
        preservationMode: "completed_today",
        settingsOverrides: SETTINGS_OVERRIDES,
        statusSuccessMessage: TODAY_SUCCESS_MESSAGE,
    };
}
