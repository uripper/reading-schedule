import type { DateInput, SessionRecord } from "../../types/core_sessions.js";
/**
 * Parses a value as rounded integer with fallback.
 * @param value String/number-like value.
 * @param fallback Fallback integer when parsing fails.
 * @returns Rounded integer.
 */
export function toInt(
  value: string | number | undefined,
  fallback = 0,
): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return Math.round(parsed);
  }
  return fallback;
}

/**
 * Converts a date input into local day key (`YYYY-MM-DD`).
 * @param iso Date input.
 * @returns Local day key, or empty string when invalid.
 */
export function isoLocalDayKey(iso: DateInput): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayOfMonth}`;
}

/**
 * Formats a human-readable time range between two date inputs.
 * @param startIso Start time input.
 * @param endIso End time input.
 * @returns Date/time range string.
 */
export function formatTimeRange(startIso: DateInput, endIso: DateInput): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Unknown time";
  }
  const startFormat = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const endFormat = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });
  return `${startFormat.format(start)} - ${endFormat.format(end)}`;
}

/**
 * Wraps an index to fit list length, returning -1 for empty lists.
 * @param index Candidate index.
 * @param length List length.
 * @returns Wrapped index or -1.
 */
export function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return -1;
  }
  return ((index % length) + length) % length;
}

/**
 * Formats duration seconds as `MM:SS`.
 * @param totalSeconds Total elapsed seconds.
 * @returns Timer text.
 */
export function formatTimer(totalSeconds: number): string {
  const secondsPerMinute = 60;
  const minutes = Math.floor(totalSeconds / secondsPerMinute);
  const seconds = totalSeconds % secondsPerMinute;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Returns today's local day key.
 * @returns Local day key for now.
 */
export function todayKey(): string {
  return isoLocalDayKey(new Date().toISOString());
}

/**
 * Sums session minutes for a specific day key.
 * @param sessions Session records.
 * @param dayKey Target day key.
 * @returns Total minutes for that day.
 */
export function minutesForDay(sessions: SessionRecord[], dayKey: string): number {
  return sessions
    .filter((session) => isoLocalDayKey(session.ended_at) === dayKey)
    .reduce((sum, session) => sum + Number(session.minutes ?? 0), 0);
}

/**
 * Computes current daily streak from session minutes.
 * @param sessions Session records.
 * @returns Consecutive-day streak ending today.
 */
export function streakFromSessions(sessions: SessionRecord[]): number {
  const minuteMap = new Map<string, number>();
  sessions.forEach((session) => {
    const key = isoLocalDayKey(session.ended_at);
    if (key.length === 0) {
      return;
    }
    minuteMap.set(
      key,
      (minuteMap.get(key) ?? 0) + Number(session.minutes ?? 0),
    );
  });

  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = isoLocalDayKey(cursor.toISOString());
    const minutes = minuteMap.get(key) ?? 0;
    if (minutes <= 0) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
