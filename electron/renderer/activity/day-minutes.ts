import type { DayMinutesArgs, DayMinutesMap } from "../../types/types.ts";
import { localDayKeyFromIso } from "../app/date_keys.ts";
import { sessionKeyFor } from "../calendar/utils.ts";
import { addMinutes, includeDayKey } from "./day-minutes-collect.ts";

const MIN_STREAK_MINUTES = 1;
const PREVIOUS_DAY_OFFSET = 1;

function addSessionMinutes(
    dayMinutes: DayMinutesMap,
    args: Pick<DayMinutesArgs, "sessions" | "year">,
): void {
    for (const SESSION of args.sessions) {
        const DAY_KEY = localDayKeyFromIso(SESSION.ended_at);
        if (!includeDayKey(DAY_KEY, args.year)) {
            continue;
        }
        addMinutes(dayMinutes, DAY_KEY, Number(SESSION.minutes || 0));
    }
}

function includesScheduledRow(
    row: NonNullable<DayMinutesArgs["lastResult"]>["schedule"][number],
    scheduleCompletions: DayMinutesArgs["scheduleCompletions"],
    year: DayMinutesArgs["year"],
): boolean {
    const DAY_KEY = String(row.date);
    if (!includeDayKey(DAY_KEY, year)) {
        return false;
    }
    const COMPLETION_KEY = sessionKeyFor(row);
    return scheduleCompletions[COMPLETION_KEY] === true;
}

function addScheduledMinutes(
    dayMinutes: DayMinutesMap,
    args: Pick<DayMinutesArgs, "lastResult" | "scheduleCompletions" | "year">,
): void {
    const ROWS = args.lastResult?.schedule ?? [];
    for (const ROW of ROWS) {
        if (!includesScheduledRow(ROW, args.scheduleCompletions, args.year)) {
            continue;
        }
        const DAY_KEY = String(ROW.date);
        addMinutes(dayMinutes, DAY_KEY, Number(ROW.minutes));
    }
}

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
    addSessionMinutes(MINUTES_BY_DAY, { sessions, year });
    addScheduledMinutes(MINUTES_BY_DAY, {
        lastResult,
        scheduleCompletions,
        year,
    });
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
    const GOAL_MINUTES = normalizedStreakGoalMinutes(minimumMinutesPerDay);
    let streakDays = 0;
    const CURSOR = new Date();
    for (;;) {
        if (!isStreakDay(dayMinutes, CURSOR, GOAL_MINUTES)) {
            break;
        }
        streakDays += 1;
        moveToPreviousDay(CURSOR);
    }
    return streakDays;
}

function normalizedStreakGoalMinutes(minimumMinutesPerDay: number): number {
    return Math.max(
        MIN_STREAK_MINUTES,
        Number(minimumMinutesPerDay || MIN_STREAK_MINUTES),
    );
}

function dayKeyForDate(date: Date): string {
    return localDayKeyFromIso(date.toISOString());
}

function isStreakDay(
    dayMinutes: DayMinutesMap,
    date: Date,
    goalMinutes: number,
): boolean {
    return dayMinutesForKey(dayMinutes, dayKeyForDate(date)) >= goalMinutes;
}

function moveToPreviousDay(date: Date): void {
    date.setDate(date.getDate() - PREVIOUS_DAY_OFFSET);
}
