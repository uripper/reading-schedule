/**
 * Selects date preservation and consumed-capacity constraints for replans.
 */

import type {
    PlannerScheduleRow,
    PlannerSettings,
    ReplanPolicy,
    ReplanPolicyArgs,
} from "../../types/types.ts";
import { isScheduleRowCompleted } from "../calendar/utils.ts";
import { nextDayKey, todayDayKey } from "./date_keys.ts";

const AUTOMATIC_SUCCESS_MESSAGE = "Schedule Updated";
const TODAY_SUCCESS_MESSAGE = "Today Replanned";

function hasRowsToday(rows: PlannerScheduleRow[], todayKey: string): boolean {
    return rows.some((row) => row.date === todayKey);
}

function completedRowsToday(
    args: ReplanPolicyArgs,
    todayKey: string,
): PlannerScheduleRow[] {
    return args.previousRows.filter((row) => {
        return (
            row.date === todayKey &&
            isScheduleRowCompleted(row, args.completions)
        );
    });
}

function reservedSettings(
    rows: PlannerScheduleRow[],
    todayKey: string,
): PlannerSettings {
    const BOOK_IDS = new Set<string>();
    let reservedMinutes = 0;
    for (const ROW of rows) {
        BOOK_IDS.add(String(ROW.book_id));
        reservedMinutes += Math.max(0, Math.round(ROW.minutes));
    }
    return {
        reserved_book_ids_by_date: {
            [todayKey]: [...BOOK_IDS],
        },
        reserved_minutes_by_date: {
            [todayKey]: reservedMinutes,
        },
        reserved_sessions_by_date: {
            [todayKey]: rows.length,
        },
    };
}

function automaticPolicy(
    previousRows: PlannerScheduleRow[],
    todayKey: string,
): ReplanPolicy {
    let minimumStartDate = todayKey;
    if (hasRowsToday(previousRows, todayKey)) {
        minimumStartDate = nextDayKey(todayKey);
    }
    return {
        minimumStartDate,
        preservationMode: "through_today",
        settingsOverrides: {},
        statusSuccessMessage: AUTOMATIC_SUCCESS_MESSAGE,
    };
}

/**
 * Builds the effective policy for an automatic or explicit Today replan.
 * @param args - Existing schedule, completions, and requested replan scope.
 * @returns Date boundary, preservation mode, and transient planner settings.
 */
export function replanPolicy(args: ReplanPolicyArgs): ReplanPolicy {
    const TODAY_KEY = args.todayKey ?? todayDayKey();
    if (!args.explicitToday) {
        return automaticPolicy(args.previousRows, TODAY_KEY);
    }
    return {
        minimumStartDate: TODAY_KEY,
        preservationMode: "completed_today",
        settingsOverrides: reservedSettings(
            completedRowsToday(args, TODAY_KEY),
            TODAY_KEY,
        ),
        statusSuccessMessage: TODAY_SUCCESS_MESSAGE,
    };
}
