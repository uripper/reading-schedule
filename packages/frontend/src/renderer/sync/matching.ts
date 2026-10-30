/** Ranks local library titles without network requests or fuzzy-search dependencies. */
import type {
    Book,
    KoboLibraryMatch,
    KoboProgress,
    KoboReviewEntry,
} from "@reading-schedule/contracts";

import { koboTitleSimilarity, normalizeKoboTitle } from "./match-score.ts";

const MIN_SEARCH_SCORE = 0.2;
const MIN_SUGGESTION_SCORE = 0.45;
const CLEAR_MATCH_SCORE = 0.7;
const CLEAR_MATCH_MARGIN = 0.08;
const MAX_SUGGESTIONS = 5;

/** Manual searching accepts partial titles and author names in addition to fuzzy terms. */
function libraryScore(query: string, book: Book, manual: boolean): number {
    const TITLE = normalizeKoboTitle(book.title);
    if (!manual) {
        return koboTitleSimilarity(query, TITLE);
    }
    const AUTHOR = normalizeKoboTitle(book.author);
    if (query !== "" && (TITLE.includes(query) || AUTHOR.includes(query))) {
        return 1;
    }
    return Math.max(
        koboTitleSimilarity(query, TITLE),
        koboTitleSimilarity(query, AUTHOR),
    );
}

/** Returns deterministic ranked results; an empty query browses the library alphabetically. */
export function rankKoboLibrary(
    query: string,
    books: readonly Book[],
    manual = true,
): KoboLibraryMatch[] {
    const QUERY = normalizeKoboTitle(query);
    const RANKED = books
        .map((book) => ({ book, score: libraryScore(QUERY, book, manual) }))
        .filter((match) => QUERY === "" || match.score >= MIN_SEARCH_SCORE);
    RANKED.sort(
        (left, right) =>
            right.score - left.score ||
            left.book.title.localeCompare(right.book.title),
    );
    return RANKED;
}

/** Keeps only plausible automatic suggestions and selects a clear best candidate. */
function fuzzyEntry(
    record: KoboProgress,
    books: readonly Book[],
): KoboReviewEntry {
    const RANKED = rankKoboLibrary(record.title, books, false)
        .filter((match) => match.score >= MIN_SUGGESTION_SCORE)
        .slice(0, MAX_SUGGESTIONS);
    let matchKind: KoboReviewEntry["matchKind"] = "none";
    if (RANKED.length > 0) {
        matchKind = "fuzzy";
    }
    return {
        conflictingRecords: [],
        matches: RANKED.map((match) => match.book),
        matchKind,
        record,
        requiresMatchReview: bestSuggestion(RANKED) === null,
        requiresSourceReview: false,
        suggestedBookId: RANKED[0]?.book.book_id ?? null,
    };
}

/** Chooses a best match only when its score clearly exceeds alternatives. */
function bestSuggestion(ranked: readonly KoboLibraryMatch[]): string | null {
    const FIRST = ranked[0];
    const NEXT_SCORE = ranked[1]?.score ?? 0;
    if (
        FIRST !== undefined &&
        FIRST.score >= CLEAR_MATCH_SCORE &&
        FIRST.score - NEXT_SCORE >= CLEAR_MATCH_MARGIN
    ) {
        return FIRST.book.book_id;
    }
    return null;
}

/** Prefers approved source links, then normalized exact titles, then ranked suggestions. */
export function matchKoboRecord(
    record: KoboProgress,
    books: readonly Book[],
): KoboReviewEntry {
    const LINKED = books.filter(
        (book) => book.kobo_progress?.contentId === record.contentId,
    );
    if (LINKED.length > 0) {
        return exactEntry(record, LINKED, "linked");
    }
    const TITLE = normalizeKoboTitle(record.title);
    const EXACT = books.filter(
        (book) => TITLE !== "" && normalizeKoboTitle(book.title) === TITLE,
    );
    if (EXACT.length > 0) {
        return exactEntry(record, EXACT, "exact");
    }
    return fuzzyEntry(record, books);
}

/** Selects only unique exact or previously linked matches. */
function exactEntry(
    record: KoboProgress,
    matches: Book[],
    matchKind: "exact" | "linked",
): KoboReviewEntry {
    return {
        conflictingRecords: [],
        matches,
        matchKind,
        record,
        requiresMatchReview: matches.length !== 1,
        requiresSourceReview: false,
        suggestedBookId: matches[0]?.book_id ?? null,
    };
}
