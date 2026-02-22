type NumericLike = string | number | null | undefined;

/**
 *
 * @param text
 */
export function escapeHtml(text: NumericLike): string {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 *
 * @param value
 * @param min
 * @param max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 *
 * @param raw
 * @param fallback
 */
export function toInt(raw: NumericLike, fallback = 0): number {
  const n = Number(raw);
  if (Number.isFinite(n)) {
    return Math.round(n);
  }
  return fallback;
}

/**
 *
 * @param raw
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
 *
 * @param raw
 */
export function toOptionalDate(raw: NumericLike): string | null {
  const value = String(raw || "").trim();
  return value || null;
}

/**
 *
 * @param raw
 */
export function formatInt(raw: NumericLike): string {
  const n = Number(raw || 0);
  if (!Number.isFinite(n)) {
    return "n/a";
  }
  const clamped = Math.max(0, Math.round(n));
  return new Intl.NumberFormat().format(clamped);
}
