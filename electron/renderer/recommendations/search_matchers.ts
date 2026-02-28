import {
    type Book,
    type BookLookupItem,
    type RecommendationItem,
} from "../../types/types.js";
import {
    AUTHOR_LOCALE,
    AUTHOR_MAX_LENGTH,
    AUTHOR_MAX_WORDS,
    AUTHOR_MIN_KEY_LENGTH,
    DEFAULT_WORDS_TOTAL,
    NON_BOOK_TITLE_PATTERNS,
    TITLE_MAX_LENGTH,
    TITLE_MIN_LENGTH,
    WORDS_PER_PAGE_ESTIMATE,
} from "./search_constants.js";

/**
 * Normalizes text for case-insensitive recommendation comparisons.
 * @param value Raw text value.
 * @returns Lowercased trimmed text.
 */
export function normalizedText(value: string | null | undefined): string {
    return String(value ?? "")
        .trim()
        .toLocaleLowerCase(AUTHOR_LOCALE);
}

/**
 * Builds a stable key from title and author.
 * @param title Book title.
 * @param author Author text.
 * @returns Normalized recommendation key.
 */
export function recommendationKey(title: string, author: string): string {
    return `${normalizedText(title)}|${normalizedText(author)}`;
}

/**
 * Normalizes text for alphanumeric token comparisons.
 * @param value Raw text value.
 * @returns Lowercased text with punctuation collapsed to spaces.
 */
function normalizedAlnumText(value: string): string {
    return value
        .normalize("NFKD")
        .replaceAll(/[^\p{L}\p{N}\s]/gu, " ")
        .toLocaleLowerCase(AUTHOR_LOCALE)
        .trim();
}

/**
 * Checks whether candidate title looks like a book title rather than metadata noise.
 * @param title Candidate title.
 * @returns True when title passes quality heuristics.
 */
function isPlausibleBookTitle(title: string): boolean {
    const text = title.trim();
    if (text.length < TITLE_MIN_LENGTH || text.length > TITLE_MAX_LENGTH) {
        return false;
    }
    const normalized = normalizedText(text);
    for (const pattern of NON_BOOK_TITLE_PATTERNS) {
        if (normalized.includes(pattern)) {
            return false;
        }
    }
    return true;
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
export function authorMatches(
    readAuthor: string,
    candidateAuthor: string,
): boolean {
    const readAuthorKey = normalizedAlnumText(readAuthor);
    const candidateAuthorKey = normalizedAlnumText(candidateAuthor);
    if (readAuthorKey.length === 0 || candidateAuthorKey.length === 0) {
        return false;
    }
    const candidateWordCount = candidateAuthorKey
        .split(/\s+/)
        .filter(Boolean).length;
    if (candidateWordCount > AUTHOR_MAX_WORDS) {
        return false;
    }
    if (candidateAuthorKey.length > AUTHOR_MAX_LENGTH) {
        return false;
    }
    if (readAuthorKey === candidateAuthorKey) {
        return true;
    }
    if (candidateAuthorKey.startsWith(readAuthorKey)) {
        return true;
    }
    if (readAuthorKey.startsWith(candidateAuthorKey)) {
        return true;
    }
    return (
        readAuthorKey.includes(candidateAuthorKey) &&
        candidateAuthorKey.length >= AUTHOR_MIN_KEY_LENGTH
    );
}

/**
 * Precomputes dedupe keys for titles already in the shelf.
 * @param books Existing shelf books.
 * @returns Set of normalized title-author keys.
 */
export function addExistingBookKeys(books: Book[]): Set<string> {
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
export function normalizeLookupRecommendation(
    item: BookLookupItem,
    readAuthor: string,
): RecommendationItem | null {
    const title = String(item.title ?? "").trim();
    if (!isPlausibleBookTitle(title)) {
        return null;
    }
    const lookupAuthor = String(item.author ?? "").trim();
    let author = readAuthor;
    if (lookupAuthor.length > 0) {
        author = lookupAuthor;
    }
    return {
        author,
        coverUrl: String(item.cover_url ?? "").trim(),
        title,
        wordsTotal: wordsFromLookup(item),
    };
}
