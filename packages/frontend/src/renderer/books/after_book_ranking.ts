/**
 * Orders After Book candidates: books on the same shelf first, then books
 * sharing a collection with the edited book, then everything else. Within a
 * group, word-start matches come before mid-word ones, then title order.
 */
import type { AfterBookRankContext, Book } from "../../types/types.ts";
import { compareBooks, optionLabel } from "./after_book_picker_helpers.ts";
import { blockedDescendantIds } from "./blocker-lineage.ts";
import { compareCollectionNames, normalizeCollections } from "./collection.ts";
import { matchText } from "./text_match.ts";

const SAME_SHELF_TIER = 0;
const SHARED_COLLECTION_TIER = 1;
const OTHER_TIER = 2;
const NO_MATCH_RANK = 0;

// audit-allow-local-types: Private sort key for one candidate.
type RankedBook = { book: Book; matchRank: number; tier: number };

/**
 * Lists the ids the picker must leave out for a book: the book itself and
 * every book that already comes after it.
 * @param books - Library books.
 * @param bookId - Book being edited; empty for a new book.
 * @returns Ids to exclude.
 */
export function excludedAfterBookIds(
    books: Book[],
    bookId: string,
): Set<string> {
    const EXCLUDED = blockedDescendantIds(books, bookId);
    if (bookId !== "") {
        EXCLUDED.add(bookId);
    }
    return EXCLUDED;
}

/**
 * Decides which group a candidate belongs to.
 * @param book - Candidate book.
 * @param context - Edited book's shelf and collections.
 * @returns Group order; lower comes first.
 */
function relationTier(book: Book, context: AfterBookRankContext): number {
    if (context.shelf !== "" && book.shelf === context.shelf) {
        return SAME_SHELF_TIER;
    }
    const SHARES = normalizeCollections(book.collections).some((name) => {
        return context.collections.some((own) => {
            return compareCollectionNames(own, name) === 0;
        });
    });
    if (SHARES) {
        return SHARED_COLLECTION_TIER;
    }
    return OTHER_TIER;
}

/**
 * Orders two ranked candidates.
 * @param left - Left candidate.
 * @param right - Right candidate.
 * @returns Sort order.
 */
function compareRanked(left: RankedBook, right: RankedBook): number {
    if (left.tier !== right.tier) {
        return left.tier - right.tier;
    }
    if (left.matchRank !== right.matchRank) {
        return left.matchRank - right.matchRank;
    }
    return compareBooks(left.book, right.book);
}

/**
 * Filters and orders the books that can come before the edited book.
 * @param books - Candidate books.
 * @param context - Edited book's shelf, collections, and excluded ids.
 * @param query - Text typed in the picker.
 * @returns Offerable books, best first.
 */
export function rankAfterBookCandidates(
    books: Book[],
    context: AfterBookRankContext,
    query: string,
): Book[] {
    const RANKED: RankedBook[] = [];
    for (const BOOK of books) {
        const ENTRY = rankedCandidate(BOOK, context, query);
        if (ENTRY !== null) {
            RANKED.push(ENTRY);
        }
    }
    return RANKED.toSorted(compareRanked).map((entry) => entry.book);
}

/**
 * Checks whether a book may be offered at all.
 * @param book - Candidate book.
 * @param context - Excluded ids.
 * @returns `true` when the book has an id and is not excluded.
 */
function isOfferable(book: Book, context: AfterBookRankContext): boolean {
    const ID = String(book.book_id || "");
    return ID !== "" && !context.excludedIds.has(ID);
}

/**
 * Builds the sort key for one candidate.
 * @param book - Candidate book.
 * @param context - Edited book's shelf, collections, and excluded ids.
 * @param query - Text typed in the picker.
 * @returns Sort key, or `null` when the book is excluded or does not match.
 */
function rankedCandidate(
    book: Book,
    context: AfterBookRankContext,
    query: string,
): RankedBook | null {
    if (!isOfferable(book, context)) {
        return null;
    }
    const MATCH = matchText(optionLabel(book), query);
    if (MATCH === null && query.trim() !== "") {
        return null;
    }
    return {
        book,
        matchRank: MATCH?.rank ?? NO_MATCH_RANK,
        tier: relationTier(book, context),
    };
}
