import type { BookLookupItem } from "../app/types.js";
import type { PlannerApi } from "../app/types_api.js";
import type { Book } from "../books/types.js";
import { buildRecommendations, deriveReadAuthors, type RecommendationItem } from "./model.js";

const MAX_AUTHORS = 8;
const MAX_PER_AUTHOR = 3;
const DEFAULT_WORDS_TOTAL = 60000;
const WORDS_PER_PAGE_ESTIMATE = 300;
const AUTHOR_LOCALE = "en";

type RecommendationSearchApi = Pick<PlannerApi, "searchBooks">;

/**
 * Normalizes text for case-insensitive recommendation comparisons.
 * @param value Raw text value.
 * @returns Lowercased trimmed text.
 */
function normalizedText(value: string | null | undefined): string {
  return String(value ?? "").trim().toLocaleLowerCase(AUTHOR_LOCALE);
}

/**
 * Builds a stable key from title and author.
 * @param title Book title.
 * @param author Author text.
 * @returns Normalized recommendation key.
 */
function recommendationKey(title: string, author: string): string {
  return `${normalizedText(title)}|${normalizedText(author)}`;
}

/**
 * Resolves words-total estimate from lookup metadata.
 * @param item Lookup item with optional words/pages estimates.
 * @returns Positive words-total estimate.
 */
function wordsFromLookup(item: BookLookupItem): number {
  const wordsEstimate = Number(item.words_estimate ?? 0);
  if (wordsEstimate > 0) {
    return Math.round(wordsEstimate);
  }
  const pagesEstimate = Number(item.pages_estimate ?? 0);
  if (pagesEstimate > 0) {
    return Math.round(pagesEstimate * WORDS_PER_PAGE_ESTIMATE);
  }
  return DEFAULT_WORDS_TOTAL;
}

/**
 * Checks whether two author names likely refer to the same author.
 * @param readAuthor Author from an already-read shelf book.
 * @param candidateAuthor Author returned from lookup results.
 * @returns True when names overlap after normalization.
 */
function authorMatches(readAuthor: string, candidateAuthor: string): boolean {
  const readAuthorKey = normalizedText(readAuthor);
  const candidateAuthorKey = normalizedText(candidateAuthor);
  if (readAuthorKey.length === 0 || candidateAuthorKey.length === 0) {
    return false;
  }
  if (readAuthorKey.includes(candidateAuthorKey)) {
    return true;
  }
  if (candidateAuthorKey.includes(readAuthorKey)) {
    return true;
  }
  return false;
}

/**
 * Precomputes dedupe keys for titles already in the shelf.
 * @param books Existing shelf books.
 * @returns Set of normalized title-author keys.
 */
function addExistingBookKeys(books: Book[]): Set<string> {
  const keys = new Set<string>();
  for (const book of books) {
    keys.add(recommendationKey(book.title, book.author));
  }
  return keys;
}

/**
 * Normalizes one lookup row into a recommendation item.
 * @param item Raw lookup item.
 * @param readAuthor Read author fallback when lookup row has no author.
 * @returns Recommendation row or `null` when title is missing.
 */
function normalizeLookupRecommendation(
  item: BookLookupItem,
  readAuthor: string,
): RecommendationItem | null {
  const title = String(item.title ?? "").trim();
  if (title.length === 0) {
    return null;
  }
  const lookupAuthor = String(item.author ?? "").trim();
  let author = readAuthor;
  if (lookupAuthor.length > 0) {
    author = lookupAuthor;
  }
  return {
    author,
    title,
    wordsTotal: wordsFromLookup(item),
  };
}

/**
 * Fetches recommendations from lookup search using already-read authors in the shelf.
 * Falls back to static local recommendations when no dynamic matches are found.
 * @param books Existing library books.
 * @param api Planner API lookup surface.
 * @returns Recommendation rows suitable for panel rendering.
 */
export async function findRecommendations(
  books: Book[],
  api: RecommendationSearchApi,
): Promise<RecommendationItem[]> {
  const existingKeys = addExistingBookKeys(books);
  const recommendationKeys = new Set<string>();
  const recommendations: RecommendationItem[] = [];
  const readAuthors = deriveReadAuthors(books).slice(0, MAX_AUTHORS);

  for (const author of readAuthors) {
    let addedForAuthor = 0;
    let lookupItems: BookLookupItem[] = [];
    try {
      lookupItems = await api.searchBooks(author);
    } catch {
      lookupItems = [];
    }
    for (const lookupItem of lookupItems) {
      if (addedForAuthor >= MAX_PER_AUTHOR) {
        break;
      }
      const candidate = normalizeLookupRecommendation(lookupItem, author);
      if (candidate === null) {
        continue;
      }
      if (!authorMatches(author, candidate.author)) {
        continue;
      }
      const key = recommendationKey(candidate.title, candidate.author);
      if (existingKeys.has(key) || recommendationKeys.has(key)) {
        continue;
      }
      recommendationKeys.add(key);
      recommendations.push(candidate);
      addedForAuthor += 1;
    }
  }

  if (recommendations.length > 0) {
    return recommendations;
  }
  return buildRecommendations(books);
}
