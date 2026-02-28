import { type DateInput, type SessionRecord } from "../../types/types.js";
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
    const PARSED = Number(value);
    if (Number.isFinite(PARSED)) {
        return Math.round(PARSED);
    }
    return fallback;
}

/**
 * Converts a date input into local day key (`YYYY-MM-DD`).
 * @param iso Date input.
 * @returns Local day key, or empty string when invalid.
 */
export function isoLocalDayKey(iso: DateInput): string {
    const DATE = new Date(iso);
    if (Number.isNaN(DATE.getTime())) {
        return "";
    }
    const YEAR = DATE.getFullYear();
    const MONTH = String(DATE.getMonth() + 1).padStart(2, "0");
    const DAY_OF_MONTH = String(DATE.getDate()).padStart(2, "0");
    return `${YEAR}-${MONTH}-${DAY_OF_MONTH}`;
}

/**
 * Formats a human-readable time range between two date inputs.
 * @param startIso Start time input.
 * @param endIso End time input.
 * @returns Date/time range string.
 */
export function formatTimeRange(
    startIso: DateInput,
    endIso: DateInput,
): string {
    const START = new Date(startIso);
    const END = new Date(endIso);
    if (Number.isNaN(START.getTime()) || Number.isNaN(END.getTime())) {
        return "Unknown time";
    }
    const START_FORMAT = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
    const END_FORMAT = new Intl.DateTimeFormat(undefined, {
        timeStyle: "short",
    });
    return `${START_FORMAT.format(START)} - ${END_FORMAT.format(END)}`;
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
    const SECONDS_PER_MINUTE = 60;
    const MINUTES = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const SECONDS = totalSeconds % SECONDS_PER_MINUTE;
    return `${String(MINUTES).padStart(2, "0")}:${String(SECONDS).padStart(2, "0")}`;
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
export function minutesForDay(
    sessions: SessionRecord[],
    dayKey: string,
): number {
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
    const MINUTE_MAP = new Map<string, number>();
    sessions.forEach((session) => {
        const KEY = isoLocalDayKey(session.ended_at);
        if (KEY.length === 0) {
            return;
        }
        MINUTE_MAP.set(
            KEY,
            (MINUTE_MAP.get(KEY) ?? 0) + Number(session.minutes ?? 0),
        );
    });

    let streak = 0;
    const CURSOR = new Date();
    for (;;) {
        const KEY = isoLocalDayKey(CURSOR.toISOString());
        const MINUTES = MINUTE_MAP.get(KEY) ?? 0;
        if (MINUTES <= 0) {
            break;
        }
        streak += 1;
        CURSOR.setDate(CURSOR.getDate() - 1);
    }

    return streak;
}
