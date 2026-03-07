import { localDayKeyFromIso } from "../app/date_keys.js";
/**
 * Parses a value as rounded integer with fallback.
 * @param value - String/number-like value.
 * @param fallback - Fallback integer when parsing fails.
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
 * Returns today's local day key.
 * @returns Local day key for now.
 */
export function todayKey(): string {
    return localDayKeyFromIso(new Date().toISOString());
}
