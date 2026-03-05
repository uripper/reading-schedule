import type { NumericLike } from "../../types/types.js";

/**
 * Clamps numeric value between inclusive bounds.
 * @param value - Candidate numeric value.
 * @param min - Inclusive minimum.
 * @param max - Inclusive maximum.
 * @returns Clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Parses rounded integer with configurable fallback.
 * @param raw - Raw numeric-like input.
 * @param fallback - Value used when input is non-finite.
 * @returns Rounded integer result.
 */
export function toInt(raw: NumericLike, fallback = 0): number {
    const N = Number(raw);
    if (Number.isFinite(N)) {
        return Math.round(N);
    }
    return fallback;
}

/**
 * Parses optional rounded integer, returning null for blank/invalid input.
 * @param raw - Raw numeric-like input.
 * @returns Rounded integer or `null`.
 */
export function toOptionalInt(raw: NumericLike): number | null {
    if (raw === null || raw === undefined || raw === "") {
        return null;
    }
    const N = Number(raw);
    if (Number.isFinite(N)) {
        return Math.round(N);
    }
    return null;
}

/**
 * Normalizes optional date-like input into nullable trimmed text.
 * @param raw - Raw date-like input.
 * @returns Trimmed date string or `null`.
 */
export function toOptionalDate(raw: NumericLike): string | null {
    const VALUE = String(raw ?? "").trim();
    return VALUE || null;
}

/**
 * Formats non-negative rounded integers for display.
 * @param raw - Raw numeric-like input.
 * @returns Localized integer text or `"n/a"` when invalid.
 */
export function formatInt(raw: NumericLike): string {
    const N = Number(raw ?? 0);
    if (!Number.isFinite(N)) {
        return "n/a";
    }
    const CLAMPED = Math.max(0, Math.round(N));
    return new Intl.NumberFormat().format(CLAMPED);
}
