import type { PlannerResult } from "../app/types.js";
import { sessionKeyFor } from "../calendar/utils.js";
import type { Session } from "../sessions/normalize.js";
import { isoLocalDayKey } from "../sessions/utils.js";
import { addMinutes, includeDayKey } from "./day_minutes_collect.js";

const MIN_STREAK_MINUTES = 1;
const PREVIOUS_DAY_OFFSET = 1;
const ZERO_MINUTES = 0;

export type DayMinutesMap = Map<string, number>;

type DayMinutesArgs = {
  sessions: Session[];
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  year: number | null;
};

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

  const rows = lastResult?.schedule || [];
  rows.forEach((row) => {
    const dayKey = String(row.date || "");
    if (!includeDayKey(dayKey, year)) {
      return;
    }
    const completionKey = sessionKeyFor(row);
    if (!scheduleCompletions[completionKey]) {
      return;
    }
    addMinutes(minutesByDay, dayKey, Number(row.minutes || ZERO_MINUTES));
  });

  return minutesByDay;
}

export function dayMinutesForKey(
  dayMinutes: DayMinutesMap,
  dayKey: string,
): number {
  return dayMinutes.get(dayKey) || ZERO_MINUTES;
}

export function totalMinutes(dayMinutes: DayMinutesMap): number {
  let total = ZERO_MINUTES;
  dayMinutes.forEach((minutes) => {
    total += minutes;
  });
  return total;
}

export function activeDayCount(dayMinutes: DayMinutesMap): number {
  let total = ZERO_MINUTES;
  dayMinutes.forEach((minutes) => {
    if (minutes > ZERO_MINUTES) {
      total += 1;
    }
  });
  return total;
}

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

  while (true) {
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
