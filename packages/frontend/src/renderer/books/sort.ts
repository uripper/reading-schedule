/**
 * Sort orchestration for the books grid toolbar.
 */
import type {
    Book,
    SortBy,
    SortComparator,
    SortDirection,
} from "../../types/types.ts";
import { normalizeShelfName } from "./shelf.ts";
import { compareAuthorText } from "./sort-author.ts";
import {
    compareNumbers,
    compareText,
    compareTitleText,
} from "./sort-compare.ts";

export const SORT_BY_TITLE = "title";
export const SORT_BY_AUTHOR = "author";
export const SORT_BY_PAGES_TOTAL = "pages_total";
export const SORT_BY_PAGES_READ = "pages_read";
export const SORT_BY_WORDS_TOTAL = "words_total";
export const SORT_BY_PROGRESS = "progress_percent";
export const SORT_BY_PRIORITY = "priority";
export const SORT_BY_DIFFICULTY = "difficulty";
export const SORT_BY_DEADLINE = "deadline";
export const SORT_BY_ESTIMATED_FINISH = "estimated_finish";
export const SORT_BY_SHELF = "shelf";

export const SORT_DIRECTION_ASC = "asc";
export const SORT_DIRECTION_DESC = "desc";

type SortBooksArgs = {
    books?: Book[];
    sortBy?: SortBy;
    sortDirection?: SortDirection;
    finishDateByBookId?: Record<string, string>;
};

type CompareBySortKeyArgs = {
    leftBook: Book;
    rightBook: Book;
    sortBy: SortBy;
    finishDateByBookId: Record<string, string>;
};

const COMPARE_BY_TITLE: SortComparator = (leftBook, rightBook) => {
    return compareTitleText(leftBook.title, rightBook.title);
};

const COMPARE_BY_AUTHOR: SortComparator = (leftBook, rightBook) => {
    return compareAuthorText(leftBook.author, rightBook.author);
};

const SORT_COMPARATORS: Record<SortBy, SortComparator> = {
    [SORT_BY_TITLE]: COMPARE_BY_TITLE,
    [SORT_BY_AUTHOR]: COMPARE_BY_AUTHOR,
    [SORT_BY_PAGES_TOTAL]: (leftBook, rightBook) =>
        compareNumbers(leftBook.pages_total, rightBook.pages_total),
    [SORT_BY_PAGES_READ]: (leftBook, rightBook) =>
        compareNumbers(leftBook.pages_read, rightBook.pages_read),
    [SORT_BY_WORDS_TOTAL]: (leftBook, rightBook) =>
        compareNumbers(leftBook.words_total, rightBook.words_total),
    [SORT_BY_PROGRESS]: (leftBook, rightBook) =>
        compareNumbers(leftBook.progress_percent, rightBook.progress_percent),
    [SORT_BY_PRIORITY]: (leftBook, rightBook) =>
        compareNumbers(leftBook.priority, rightBook.priority),
    [SORT_BY_DIFFICULTY]: (leftBook, rightBook) =>
        compareNumbers(leftBook.difficulty, rightBook.difficulty),
    [SORT_BY_DEADLINE]: (leftBook, rightBook) =>
        compareText(leftBook.deadline, rightBook.deadline),
    [SORT_BY_ESTIMATED_FINISH]: (leftBook, rightBook, finishDateByBookId) => {
        return compareText(
            finishDateByBookId[leftBook.book_id],
            finishDateByBookId[rightBook.book_id],
        );
    },
    [SORT_BY_SHELF]: (leftBook, rightBook) => {
        return compareText(
            normalizeShelfName(leftBook.shelf),
            normalizeShelfName(rightBook.shelf),
        );
    },
};

/**
 * Compares two books using selected sort field comparator.
 * @param args - Book comparison inputs.
 * @returns Negative/zero/positive comparison result.
 */
function compareBySortKey(args: CompareBySortKeyArgs): number {
    const { finishDateByBookId, leftBook, rightBook, sortBy } = args;
    const COMPARATOR = SORT_COMPARATORS[sortBy];
    return COMPARATOR(leftBook, rightBook, finishDateByBookId);
}

/**
 * Converts toolbar direction into a comparator multiplier.
 * @param sortDirection - Active toolbar direction.
 * @returns `1` for ascending and `-1` for descending.
 */
function sortDirectionSign(sortDirection: SortDirection): number {
    if (sortDirection === SORT_DIRECTION_DESC) {
        return -1;
    }
    return 1;
}

/**
 * Creates a stable book comparator for the active toolbar sort state.
 * @param sortBy - Active sort field.
 * @param sortDirection - Ascending or descending direction.
 * @param finishDateByBookId - Finish-date lookup keyed by `book_id`.
 * @returns Comparator suitable for `Array.prototype.sort`.
 */
function bookComparator(
    sortBy: SortBy,
    sortDirection: SortDirection,
    finishDateByBookId: Record<string, string>,
): (leftBook: Book, rightBook: Book) => number {
    const DIRECTION_SIGN = sortDirectionSign(sortDirection);
    return (leftBook, rightBook) => {
        const PRIMARY = compareBySortKey({
            finishDateByBookId,
            leftBook,
            rightBook,
            sortBy,
        });
        if (PRIMARY !== 0) {
            return PRIMARY * DIRECTION_SIGN;
        }
        return compareTitleText(leftBook.title, rightBook.title);
    };
}

/**
 * Returns a stably sorted copy of books for current toolbar sort controls.
 * @param args - Sort inputs from the current toolbar state.
 * @returns Sorted array copy suitable for rendering.
 */
export function sortBooks(args: SortBooksArgs = {}): Book[] {
    const {
        books = [],
        finishDateByBookId = {},
        sortBy = SORT_BY_TITLE,
        sortDirection = SORT_DIRECTION_ASC,
    } = args;
    const SORTED_BOOKS = [...books];
    SORTED_BOOKS.sort(
        bookComparator(sortBy, sortDirection, finishDateByBookId),
    );
    return SORTED_BOOKS;
}
