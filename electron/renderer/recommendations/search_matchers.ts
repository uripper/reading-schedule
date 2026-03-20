/**
 * Recommendation-match heuristics for titles and author names returned by lookup results.
 */
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
 * Checks whether title length falls within recommendation heuristics.
 * @param title - Candidate title.
 * @returns `true` when the title length is acceptable.
 */
function isPlausibleTitleLength(title: string): boolean {
    return title.length >= TITLE_MIN_LENGTH && title.length <= TITLE_MAX_LENGTH;
}

/**
 * Checks whether a title matches known non-book noise patterns.
 * @param normalizedTitle - Normalized title text.
 * @returns `true` when the title should be filtered out.
 */
function hasNonBookTitlePattern(normalizedTitle: string): boolean {
    for (const PATTERN of NON_BOOK_TITLE_PATTERNS) {
        if (normalizedTitle.includes(PATTERN)) {
            return true;
        }
    }
    return false;
}

/**
 * Checks whether candidate title looks like a book title rather than metadata noise.
 * @param title - Candidate title.
 * @returns True when title passes quality heuristics.
 */
function isPlausibleBookTitle(title: string): boolean {
    const TEXT = title.trim();
    if (!isPlausibleTitleLength(TEXT)) {
        return false;
    }
    if (hasNonBookTitlePattern(normalizedText(TEXT))) {
        return false;
    }
    return true;
}

/**
 * Counts normalized author-name words.
 * @param authorKey - Normalized author key.
 * @returns Number of non-empty author tokens.
 */
function authorWordCount(authorKey: string): number {
    return authorKey.split(/\s+/).filter(Boolean).length;
}

/**
 * Checks whether normalized author keys are usable for comparison.
 * @param readAuthorKey - Normalized read-author key.
 * @param candidateAuthorKey - Normalized candidate-author key.
 * @returns `true` when both keys satisfy basic comparison heuristics.
 */
function comparableAuthorKeys(
    readAuthorKey: string,
    candidateAuthorKey: string,
): boolean {
    if (readAuthorKey.length === 0 || candidateAuthorKey.length === 0) {
        return false;
    }
    if (authorWordCount(candidateAuthorKey) > AUTHOR_MAX_WORDS) {
        return false;
    }
    return candidateAuthorKey.length <= AUTHOR_MAX_LENGTH;
}

/**
 * Checks whether author keys match exactly or by prefix.
 * @param readAuthorKey - Normalized read-author key.
 * @param candidateAuthorKey - Normalized candidate-author key.
 * @returns `true` when one author name is a prefix of the other.
 */
function exactOrPrefixAuthorMatch(
    readAuthorKey: string,
    candidateAuthorKey: string,
): boolean {
    if (readAuthorKey === candidateAuthorKey) {
        return true;
    }
    if (candidateAuthorKey.startsWith(readAuthorKey)) {
        return true;
    }
    return readAuthorKey.startsWith(candidateAuthorKey);
}

/**
 * Checks whether the candidate author appears inside the read author key.
 * @param readAuthorKey - Normalized read-author key.
 * @param candidateAuthorKey - Normalized candidate-author key.
 * @returns `true` when the candidate key is a long enough contained match.
 */
function containedAuthorMatch(
    readAuthorKey: string,
    candidateAuthorKey: string,
): boolean {
    if (candidateAuthorKey.length < AUTHOR_MIN_KEY_LENGTH) {
        return false;
    }
    return readAuthorKey.includes(candidateAuthorKey);
}

/**
 * Resolves the author text for a normalized recommendation item.
 * @param readAuthor - Read author fallback.
 * @param lookupAuthor - Lookup-author text from the candidate item.
 * @returns Preferred author string for the recommendation row.
 */
function recommendationAuthor(
    readAuthor: string,
    lookupAuthor: string | null | undefined,
): string {
    const LOOKUP_AUTHOR = String(lookupAuthor ?? "").trim();
    if (LOOKUP_AUTHOR.length > 0) {
        return LOOKUP_AUTHOR;
    }
    return readAuthor;
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
    if (!comparableAuthorKeys(READ_AUTHOR_KEY, CANDIDATE_AUTHOR_KEY)) {
        return false;
    }
    if (exactOrPrefixAuthorMatch(READ_AUTHOR_KEY, CANDIDATE_AUTHOR_KEY)) {
        return true;
    }
    return containedAuthorMatch(READ_AUTHOR_KEY, CANDIDATE_AUTHOR_KEY);
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
    return {
        author: recommendationAuthor(readAuthor, item.author),
        coverUrl: String(item.cover_url ?? "").trim(),
        title: TITLE,
        wordsTotal: wordsFromLookup(item),
    };
}
