import type {
    Book,
    BookLookupItem,
    RecommendationItem,
} from "../../types/types.ts";
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
} from "./search_constants.ts";

/**
 * Normalizes text for case-insensitive recommendation comparisons.
 * @param value - Raw text value.
 * @returns Lowercased trimmed text.
 */
function normalizedText(value: string | null | undefined): string {
    return String(value ?? "")
        .trim()
        .toLocaleLowerCase(AUTHOR_LOCALE);
}

/**
 * Builds a stable key from title and author.
 * @param title - Book title.
 * @param author - Author text.
 * @returns Normalized recommendation key.
 */
export function recommendationKey(title: string, author: string): string {
    return `${normalizedText(title)}|${normalizedText(author)}`;
}

/**
 * Normalizes text for alphanumeric token comparisons.
 * @param value - Raw text value.
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
 * @param title - Candidate title.
 * @returns True when title passes quality heuristics.
 */
function isPlausibleBookTitle(title: string): boolean {
    const TEXT = title.trim();
    if (TEXT.length < TITLE_MIN_LENGTH || TEXT.length > TITLE_MAX_LENGTH) {
        return false;
    }
    const NORMALIZED = normalizedText(TEXT);
    for (const PATTERN of NON_BOOK_TITLE_PATTERNS) {
        if (NORMALIZED.includes(PATTERN)) {
            return false;
        }
    }
    return true;
}

/**
 * Resolves words-total estimate from lookup metadata.
 * @param item - Lookup item with optional words/pages estimates.
 * @returns Positive words-total estimate.
 */
function wordsFromLookup(item: BookLookupItem): number {
    const WORDS_ESTIMATE = Number(item.words_estimate ?? 0);
    if (WORDS_ESTIMATE > 0) {
        return Math.round(WORDS_ESTIMATE);
    }
    const PAGES_ESTIMATE = Number(item.pages_estimate ?? 0);
    if (PAGES_ESTIMATE > 0) {
        return Math.round(PAGES_ESTIMATE * WORDS_PER_PAGE_ESTIMATE);
    }
    return DEFAULT_WORDS_TOTAL;
}

/**
 * Checks whether two author names likely refer to the same author.
 * @param readAuthor - Author from an already-read shelf book.
 * @param candidateAuthor - Author returned from lookup results.
 * @returns True when names overlap after normalization.
 */
export function authorMatches(
    readAuthor: string,
    candidateAuthor: string,
): boolean {
    const READ_AUTHOR_KEY = normalizedAlnumText(readAuthor);
    const CANDIDATE_AUTHOR_KEY = normalizedAlnumText(candidateAuthor);
    if (READ_AUTHOR_KEY.length === 0 || CANDIDATE_AUTHOR_KEY.length === 0) {
        return false;
    }
    const CANDIDATE_WORD_COUNT =
        CANDIDATE_AUTHOR_KEY.split(/\s+/).filter(Boolean).length;
    if (CANDIDATE_WORD_COUNT > AUTHOR_MAX_WORDS) {
        return false;
    }
    if (CANDIDATE_AUTHOR_KEY.length > AUTHOR_MAX_LENGTH) {
        return false;
    }
    if (READ_AUTHOR_KEY === CANDIDATE_AUTHOR_KEY) {
        return true;
    }
    if (CANDIDATE_AUTHOR_KEY.startsWith(READ_AUTHOR_KEY)) {
        return true;
    }
    if (READ_AUTHOR_KEY.startsWith(CANDIDATE_AUTHOR_KEY)) {
        return true;
    }
    return (
        READ_AUTHOR_KEY.includes(CANDIDATE_AUTHOR_KEY) &&
        CANDIDATE_AUTHOR_KEY.length >= AUTHOR_MIN_KEY_LENGTH
    );
}

/**
 * Precomputes dedupe keys for titles already in the shelf.
 * @param books - Existing shelf books.
 * @returns Set of normalized title-author keys.
 */
export function addExistingBookKeys(books: Book[]): Set<string> {
    const KEYS = new Set<string>();
    for (const BOOK of books) {
        KEYS.add(recommendationKey(BOOK.title, BOOK.author));
    }
    return KEYS;
}

/**
 * Normalizes one lookup row into a recommendation item.
 * @param item - Raw lookup item.
 * @param readAuthor - Read author fallback when lookup row has no author.
 * @returns Recommendation row or `null` when title is missing.
 */
export function normalizeLookupRecommendation(
    item: BookLookupItem,
    readAuthor: string,
): RecommendationItem | null {
    const TITLE = String(item.title ?? "").trim();
    if (!isPlausibleBookTitle(TITLE)) {
        return null;
    }
    const LOOKUP_AUTHOR = String(item.author ?? "").trim();
    let author = readAuthor;
    if (LOOKUP_AUTHOR.length > 0) {
        author = LOOKUP_AUTHOR;
    }
    return {
        author,
        coverUrl: String(item.cover_url ?? "").trim(),
        title: TITLE,
        wordsTotal: wordsFromLookup(item),
    };
}
