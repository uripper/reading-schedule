import type { DayMinutesArgs, DayMinutesMap } from "../../types/types.js";
import { sessionKeyFor } from "../calendar/utils.js";
import { isoLocalDayKey } from "../sessions/utils.js";
import { addMinutes, includeDayKey } from "./day_minutes_collect.js";

const MIN_STREAK_MINUTES = 1;
const PREVIOUS_DAY_OFFSET = 1;

/**
 * Builds per-day minutes from completed focus sessions and completed planned rows.
 * @param root0 - Activity aggregation inputs including sessions, planner result,
 * completion map, and optional year filter.
 * @returns Map of `YYYY-MM-DD` to aggregated minutes.
 */
export function dayMinutesFromActivity({
    sessions,
    lastResult,
    scheduleCompletions,
    year,
}: DayMinutesArgs): DayMinutesMap {
    const MINUTES_BY_DAY = new Map<string, number>();

    for (const SESSION of sessions) {
        const DAY_KEY = isoLocalDayKey(SESSION.ended_at);
        if (!includeDayKey(DAY_KEY, year)) {
            continue;
        }
        addMinutes(MINUTES_BY_DAY, DAY_KEY, Number(SESSION.minutes || 0));
    }

    const ROWS = lastResult?.schedule ?? [];

    for (const ROW of ROWS) {
        const DAY_KEY = String(ROW.date);
        if (!includeDayKey(DAY_KEY, year)) {
            continue;
        }
        const COMPLETION_KEY = sessionKeyFor(ROW);
        if (!scheduleCompletions[COMPLETION_KEY]) {
            continue;
        }
        addMinutes(MINUTES_BY_DAY, DAY_KEY, Number(ROW.minutes));
    }

    return MINUTES_BY_DAY;
}

/**
 * Reads total minutes recorded for a specific day key.
 * @param dayMinutes - Day-minutes lookup map.
 * @param dayKey - Target day key (`YYYY-MM-DD`).
 * @returns Minutes for the day, or 0 when missing.
 */
export function dayMinutesForKey(
    dayMinutes: DayMinutesMap,
    dayKey: string,
): number {
    return dayMinutes.get(dayKey) ?? 0;
}

/**
 * Sums all minutes across the provided day-minutes map.
 * @param dayMinutes - Day-minutes lookup map.
 * @returns Total minutes across all keys.
 */
export function totalMinutes(dayMinutes: DayMinutesMap): number {
    let total = 0;
    for (const MINUTES of dayMinutes.values()) {
        total += MINUTES;
    }
    return total;
}

/**
 * Counts days with any recorded activity minutes.
 * @param dayMinutes - Day-minutes lookup map.
 * @returns Number of days with minutes greater than zero.
 */
export function activeDayCount(dayMinutes: DayMinutesMap): number {
    let total = 0;

    for (const MINUTES of dayMinutes.values()) {
        if (MINUTES > 0) {
            total += 1;
        }
    }

    return total;
}

/**
 * Computes the current backward-looking streak in days that meet the goal.
 * Streak evaluation starts at today and walks back one day at a time.
 * @param dayMinutes - Day-minutes lookup map.
 * @param minimumMinutesPerDay - Daily threshold required to count a streak day.
 * @returns Consecutive number of qualifying days ending today.
 */
export function streakFromDayMinutes(
    dayMinutes: DayMinutesMap,
    minimumMinutesPerDay = MIN_STREAK_MINUTES,
): number {
    const GOAL_MINUTES = Math.max(
        MIN_STREAK_MINUTES,
        Number(minimumMinutesPerDay || MIN_STREAK_MINUTES),
    );
    let streakDays = 0;
    const CURSOR = new Date();

    for (;;) {
        const DAY_KEY = isoLocalDayKey(CURSOR.toISOString());
        const MINUTES = dayMinutesForKey(dayMinutes, DAY_KEY);
        if (MINUTES < GOAL_MINUTES) {
            break;
        }
        streakDays += 1;
        CURSOR.setDate(CURSOR.getDate() - PREVIOUS_DAY_OFFSET);
    }

    return streakDays;
}
