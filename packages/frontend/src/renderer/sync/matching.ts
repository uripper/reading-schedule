/** Ranks local library titles without network requests or fuzzy-search dependencies. */
import type {
    Book,
    SyncLibraryMatch,
    SyncRecord,
    SyncReviewEntry,
} from "@reading-schedule/contracts";

import {
    byAuthorAgreement,
    isClearTitleChoice,
    withAuthorScore,
} from "./author-match.ts";
import { isSameSyncSource } from "./links.ts";
import { normalizeSyncTitle, syncTitleSimilarity } from "./match-score.ts";

const MIN_SEARCH_SCORE = 0.2;
const MIN_SUGGESTION_SCORE = 0.45;
const CLEAR_MATCH_SCORE = 0.7;
const CLEAR_MATCH_MARGIN = 0.08;
const MAX_SUGGESTIONS = 5;

/** Manual searching accepts partial titles and author names in addition to fuzzy terms. */
function libraryScore(query: string, book: Book, manual: boolean): number {
    const TITLE = normalizeSyncTitle(book.title);
    if (!manual) {
        return syncTitleSimilarity(query, TITLE);
    }
    const AUTHOR = normalizeSyncTitle(book.author);
    if (query !== "" && (TITLE.includes(query) || AUTHOR.includes(query))) {
        return 1;
    }
    return Math.max(
        syncTitleSimilarity(query, TITLE),
        syncTitleSimilarity(query, AUTHOR),
    );
}

/** Returns deterministic ranked results; an empty query browses the library alphabetically. */
export function rankSyncLibrary(
    query: string,
    books: readonly Book[],
    options: { author?: string; manual?: boolean } = {},
): SyncLibraryMatch[] {
    const QUERY = normalizeSyncTitle(query);
    const MANUAL = options.manual ?? true;
    const RANKED = books
        .map((book) => ({
            book,
            score: withAuthorScore(
                libraryScore(QUERY, book, MANUAL),
                options.author,
                book.author,
            ),
        }))
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
    record: SyncRecord,
    books: readonly Book[],
): SyncReviewEntry {
    const RANKED = rankSyncLibrary(record.title, books, {
        author: record.author,
        manual: false,
    })
        .filter((match) => match.score >= MIN_SUGGESTION_SCORE)
        .slice(0, MAX_SUGGESTIONS);
    let matchKind: SyncReviewEntry["matchKind"] = "none";
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
function bestSuggestion(ranked: readonly SyncLibraryMatch[]): string | null {
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
export function matchSyncRecord(
    record: SyncRecord,
    books: readonly Book[],
): SyncReviewEntry {
    const LINKED = books.filter((book) =>
        (book.sync_links ?? []).some((link) => isSameSyncSource(link, record)),
    );
    if (LINKED.length > 0) {
        return exactEntry(record, LINKED, "linked");
    }
    const TITLE = normalizeSyncTitle(record.title);
    const EXACT = books.filter(
        (book) => TITLE !== "" && normalizeSyncTitle(book.title) === TITLE,
    );
    if (EXACT.length > 0) {
        return exactTitleEntry(record, EXACT);
    }
    return fuzzyEntry(record, books);
}

/** Uses authors to choose among same-title books and to question a lone different author. */
function exactTitleEntry(
    record: SyncRecord,
    matches: readonly Book[],
): SyncReviewEntry {
    const RANKED = byAuthorAgreement(record, matches);
    return {
        ...exactEntry(record, RANKED, "exact"),
        requiresMatchReview: !isClearTitleChoice(record, RANKED),
    };
}

/** Selects only unique exact or previously linked matches. */
function exactEntry(
    record: SyncRecord,
    matches: Book[],
    matchKind: "exact" | "linked",
): SyncReviewEntry {
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
