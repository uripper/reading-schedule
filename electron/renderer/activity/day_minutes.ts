
import { sessionKeyFor } from "../calendar/utils.js";
import { isoLocalDayKey } from "../sessions/utils.js";
import { addMinutes, includeDayKey } from "./day_minutes_collect.js";
import type { DayMinutesArgs, DayMinutesMap } from "../../types/types_app.js";

const MIN_STREAK_MINUTES = 1;
const PREVIOUS_DAY_OFFSET = 1;
const ZERO_MINUTES = 0;

/**
 * Builds per-day minutes from completed focus sessions and completed planned rows.
 * @param root0 Activity aggregation inputs.
 * @param root0.sessions Session history entries.
 * @param root0.lastResult Latest planner result used for planned-row lookups.
 * @param root0.scheduleCompletions Completion map keyed by schedule session key.
 * @param root0.year Optional year filter; null includes all years.
 * @returns Map of `YYYY-MM-DD` to aggregated minutes.
 */
export function dayMinutesFromActivity({
  sessions,
  lastResult,
  scheduleCompletions,
  year,
}: DayMinutesArgs): DayMinutesMap {
  const minutesByDay = new Map<string, number>();

  sessions.forEach((session) => {
    const dayKey = isoLocalDayKey(session.ended_at);
    if (!includeDayKey(dayKey, year)) {
      return;
    }
    addMinutes(minutesByDay, dayKey, Number(session.minutes || ZERO_MINUTES));
  });

  const rows = lastResult?.schedule ?? [];
  rows.forEach((row) => {
    const dayKey = String(row.date);
    if (!includeDayKey(dayKey, year)) {
      return;
    }
    const completionKey = sessionKeyFor(row);
    if (!scheduleCompletions[completionKey]) {
      return;
    }
    addMinutes(minutesByDay, dayKey, Number(row.minutes));
  });

  return minutesByDay;
}

/**
 * Reads total minutes recorded for a specific day key.
 * @param dayMinutes Day-minutes lookup map.
 * @param dayKey Target day key (`YYYY-MM-DD`).
 * @returns Minutes for the day, or 0 when missing.
 */
export function dayMinutesForKey(
  dayMinutes: DayMinutesMap,
  dayKey: string,
): number {
  return dayMinutes.get(dayKey) ?? ZERO_MINUTES;
}

/**
 * Sums all minutes across the provided day-minutes map.
 * @param dayMinutes Day-minutes lookup map.
 * @returns Total minutes across all keys.
 */
export function totalMinutes(dayMinutes: DayMinutesMap): number {
  let total = ZERO_MINUTES;
  dayMinutes.forEach((minutes) => {
    total += minutes;
  });
  return total;
}

/**
 * Counts days with any recorded activity minutes.
 * @param dayMinutes Day-minutes lookup map.
 * @returns Number of days with minutes greater than zero.
 */
export function activeDayCount(dayMinutes: DayMinutesMap): number {
  let total = ZERO_MINUTES;
  dayMinutes.forEach((minutes) => {
    if (minutes > ZERO_MINUTES) {
      total += 1;
    }
  });
  return total;
}

/**
 * Computes the current backward-looking streak in days that meet the goal.
 * Streak evaluation starts at today and walks back one day at a time.
 * @param dayMinutes Day-minutes lookup map.
 * @param minimumMinutesPerDay Daily threshold required to count a streak day.
 * @returns Consecutive number of qualifying days ending today.
 */
export function streakFromDayMinutes(
  dayMinutes: DayMinutesMap,
  minimumMinutesPerDay = MIN_STREAK_MINUTES,
): number {
  const goalMinutes = Math.max(
    MIN_STREAK_MINUTES,
    Number(minimumMinutesPerDay || MIN_STREAK_MINUTES),
  );
  let streakDays = ZERO_MINUTES;
  const cursor = new Date();

  for (;;) {
    const dayKey = isoLocalDayKey(cursor.toISOString());
    const minutes = dayMinutesForKey(dayMinutes, dayKey);
    if (minutes < goalMinutes) {
      break;
    }
    streakDays += 1;
    cursor.setDate(cursor.getDate() - PREVIOUS_DAY_OFFSET);
  }

  return streakDays;
}
