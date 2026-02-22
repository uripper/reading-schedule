/**
 * @file Text normalization helpers for search matching and scoring.
 */
import type { SearchDoc } from "./search_shared.js";

/**
 * Normalizes free-form text into a lowercase, punctuation-stripped form.
 * @param value Raw text input.
 * @returns Normalized text suitable for matching/scoring.
 */
export function normalizeSearchText(value: string): string {
  return String(value || "")
    .normalize("NFKD")
    .replaceAll(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .trim();
}

/**
 * Splits a query string into normalized non-empty tokens.
 * @param query Raw query text.
 * @returns Normalized query tokens.
 */
export function queryTokens(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

/**
 * Returns the first author name from a raw search document.
 * @param doc Open Library search document.
 * @returns First author name, or empty string when unavailable.
 */
export function primaryAuthor(doc: SearchDoc): string {
  if (!Array.isArray(doc.author_name) || !doc.author_name.length) {
    return "";
  }
  return String(doc.author_name[0] || "");
}

/**
 * Indicates whether a search document is tagged with English language.
 * @param doc Open Library search document.
 * @returns True when language tags include English.
 */
export function hasEnglishLanguage(doc: SearchDoc): boolean {
  if (!Array.isArray(doc.language)) {
    return false;
  }
  return doc.language.some((code) => {
    const normalized = String(code || "").toLowerCase();
    if (!normalized) {
      return false;
    }
    return normalized === "eng" || normalized.endsWith("/eng");
  });
}
