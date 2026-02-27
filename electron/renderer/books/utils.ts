import type { NumericLike } from "../../types/books_types.js";

/**
 * Escapes text for safe HTML interpolation in renderer templates.
 * @param text Numeric-like value to escape.
 * @returns HTML-escaped string.
 */
export function escapeHtml(text: NumericLike): string {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Clamps numeric value between inclusive bounds.
 * @param value Candidate numeric value.
 * @param min Inclusive minimum.
 * @param max Inclusive maximum.
 * @returns Clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Parses rounded integer with configurable fallback.
 * @param raw Raw numeric-like input.
 * @param fallback Value used when input is non-finite.
 * @returns Rounded integer result.
 */
export function toInt(raw: NumericLike, fallback = 0): number {
  const n = Number(raw);
  if (Number.isFinite(n)) {
    return Math.round(n);
  }
  return fallback;
}

/**
 * Parses optional rounded integer, returning null for blank/invalid input.
 * @param raw Raw numeric-like input.
 * @returns Rounded integer or `null`.
 */
export function toOptionalInt(raw: NumericLike): number | null {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const n = Number(raw);
  if (Number.isFinite(n)) {
    return Math.round(n);
  }
  return null;
}

/**
 * Normalizes optional date-like input into nullable trimmed text.
 * @param raw Raw date-like input.
 * @returns Trimmed date string or `null`.
 */
export function toOptionalDate(raw: NumericLike): string | null {
  const value = String(raw ?? "").trim();
  return value || null;
}

/**
 * Formats non-negative rounded integers for display.
 * @param raw Raw numeric-like input.
 * @returns Localized integer text or `"n/a"` when invalid.
 */
export function formatInt(raw: NumericLike): string {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n)) {
    return "n/a";
  }
  const clamped = Math.max(0, Math.round(n));
  return new Intl.NumberFormat().format(clamped);
}
