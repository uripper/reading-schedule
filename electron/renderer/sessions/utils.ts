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
 * Returns today's local day key.
 * @returns Local day key for now.
 */
export function todayKey(): string {
    return isoLocalDayKey(new Date().toISOString());
}
