import type { SearchDoc } from "./book_lookup_search_shared.js";

export function normalizeSearchText(value: string): string {
  return String(value || "")
    .normalize("NFKD")
    .replaceAll(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .trim();
}

export function queryTokens(query: string): string[] {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean);
}

export function primaryAuthor(doc: SearchDoc): string {
  if (!Array.isArray(doc.author_name) || !doc.author_name.length) {
    return "";
  }
  return String(doc.author_name[0] || "");
}

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
