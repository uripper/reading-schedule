import { BOOK_STATUS_READ } from "../books/status.js";
import type { Book } from "../books/types.js";
import { AUTHOR_RECOMMENDATION_CATALOG, type RecommendationSeed } from "./catalog.js";
import type { RecommendationItem } from "../../types/types_experience.js";

const AUTHOR_LIST_LOCALE = "en";

/**
 * Normalizes text for case-insensitive recommendation matching.
 * @param value Raw text value.
 * @returns Lowercased trimmed text key.
 */
function normalizedText(value: string | null | undefined): string {
  return String(value ?? "").trim().toLocaleLowerCase(AUTHOR_LIST_LOCALE);
}

/**
 * Builds a stable dedupe key from recommendation title and author.
 * @param title Recommendation title.
 * @param author Recommendation author.
 * @returns Combined normalized key.
 */
function recommendationKey(title: string, author: string): string {
  return `${normalizedText(title)}|${normalizedText(author)}`;
}

/**
 * Determines whether a book should count as read for author derivation.
 * @param book Book to inspect.
 * @returns True when read status/progress/finish date indicates completion.
 */
function isReadBook(book: Book): boolean {
  if (book.status === BOOK_STATUS_READ) {
    return true;
  }
  if (book.progress_percent >= 100) {
    return true;
  }
  const finishedAt = String(book.finished_at ?? "").trim();
  if (finishedAt.length > 0) {
    return true;
  }
  return false;
}

/**
 * Derives unique read-author names from the library, preserving first-seen casing.
 * @param books Existing library books.
 * @returns Sorted unique author names that already have at least one read title.
 */
export function deriveReadAuthors(books: Book[]): string[] {
  const displayByKey = new Map<string, string>();
  for (const book of books) {
    if (!isReadBook(book)) {
      continue;
    }
    const authorText = String(book.author).trim();
    if (authorText.length === 0) {
      continue;
    }
    const key = normalizedText(authorText);
    if (!displayByKey.has(key)) {
      displayByKey.set(key, authorText);
    }
  }
  return Array.from(displayByKey.values()).sort((leftAuthor, rightAuthor) => {
    return leftAuthor.localeCompare(rightAuthor);
  });
}

/**
 * Builds per-author recommendation rows, excluding books already in the library.
 * @param books Existing library books.
 * @param catalog Static local recommendation seeds by normalized author key.
 * @returns Recommendation list suitable for rendering in the Recommendations tab.
 */
export function buildRecommendations(
  books: Book[],
  catalog: Record<string, RecommendationSeed[]> = AUTHOR_RECOMMENDATION_CATALOG,
): RecommendationItem[] {
  const existingBookKeys = new Set<string>();
  for (const book of books) {
    existingBookKeys.add(recommendationKey(book.title, book.author));
  }

  const recommendations: RecommendationItem[] = [];
  const recommendationKeys = new Set<string>();
  for (const author of deriveReadAuthors(books)) {
    const authorKey = normalizedText(author);
    const seeds = catalog[authorKey];
    if (!Array.isArray(seeds)) {
      continue;
    }
    for (const seed of seeds) {
      const key = recommendationKey(seed.title, author);
      if (existingBookKeys.has(key) || recommendationKeys.has(key)) {
        continue;
      }
      recommendationKeys.add(key);
      recommendations.push({
        author,
        coverUrl: "",
        title: seed.title,
        wordsTotal: seed.wordsTotal,
      });
    }
  }
  return recommendations;
}
