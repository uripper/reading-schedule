// @ts-nocheck
export function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function toInt(raw, fallback = 0) {
  const n = Number(raw);
  if (Number.isFinite(n)) {
    return Math.round(n);
  }
  return fallback;
}

export function toOptionalInt(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  if (Number.isFinite(n)) {
    return Math.round(n);
  }
  return null;
}

export function toOptionalDate(raw) {
  const value = String(raw || "").trim();
  return value || null;
}

export function formatInt(raw) {
  const n = Number(raw || 0);
  if (!Number.isFinite(n) || n <= 0) return "n/a";
  return new Intl.NumberFormat().format(Math.round(n));
}
