import type {
    Book,
    OptionalNumber,
    OptionalString,
    SortBy,
    SortComparator,
    SortDirection,
} from "../../types/types.js";
import { normalizeShelfName } from "./shelf.js";
import { titleSortKey } from "./title_key.js";

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

/**
 * Compares optional numbers with missing values sorted last.
 * @param left - Left numeric value.
 * @param right - Right numeric value.
 * @returns Negative/zero/positive comparison result.
 */
function compareNumbers(left: OptionalNumber, right: OptionalNumber): number {
    const LEFT_MISSING = left === null || left === undefined;
    const RIGHT_MISSING = right === null || right === undefined;
    if (LEFT_MISSING && RIGHT_MISSING) {
        return 0;
    }
    if (LEFT_MISSING) {
        return 1;
    }
    if (RIGHT_MISSING) {
        return -1;
    }
    if (left < right) {
        return -1;
    }
    if (left > right) {
        return 1;
    }
    return 0;
}

/**
 * Compares optional text values case-insensitively with blanks sorted last.
 * @param left - Left text value.
 * @param right - Right text value.
 * @returns Negative/zero/positive comparison result.
 */
function compareText(left: OptionalString, right: OptionalString): number {
    const LEFT_TEXT = String(left ?? "")
        .trim()
        .toLowerCase();
    const RIGHT_TEXT = String(right ?? "")
        .trim()
        .toLowerCase();
    const LEFT_MISSING = !LEFT_TEXT;
    const RIGHT_MISSING = !RIGHT_TEXT;
    if (LEFT_MISSING && RIGHT_MISSING) {
        return 0;
    }
    if (LEFT_MISSING) {
        return 1;
    }
    if (RIGHT_MISSING) {
        return -1;
    }
    return LEFT_TEXT.localeCompare(RIGHT_TEXT, undefined, {
        sensitivity: "base",
    });
}

/**
 * Compares titles using normalized sort keys, then raw text as tie-breaker.
 * @param left - Left title text.
 * @param right - Right title text.
 * @returns Negative/zero/positive comparison result.
 */
function compareTitleText(left: OptionalString, right: OptionalString): number {
    const LEFT_KEY = titleSortKey(left);
    const RIGHT_KEY = titleSortKey(right);
    const BY_KEY = compareText(LEFT_KEY, RIGHT_KEY);
    if (BY_KEY !== 0) {
        return BY_KEY;
    }
    return compareText(left, right);
}

const COMPARE_BY_TITLE: SortComparator = (leftBook, rightBook) => {
    return compareTitleText(leftBook.title, rightBook.title);
};

const SORT_COMPARATORS: Record<SortBy, SortComparator> = {
    [SORT_BY_TITLE]: COMPARE_BY_TITLE,
    [SORT_BY_AUTHOR]: (leftBook, rightBook) =>
        compareText(leftBook.author, rightBook.author),
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
 * @param leftBook - Left book candidate.
 * @param rightBook - Right book candidate.
 * @param sortBy - Active sort key.
 * @param finishDateByBookId - Finish-date lookup keyed by `book_id`.
 * @returns Negative/zero/positive comparison result.
 */
function compareBySortKey(
    leftBook: Book,
    rightBook: Book,
    sortBy: SortBy,
    finishDateByBookId: Record<string, string>,
): number {
    const COMPARATOR = SORT_COMPARATORS[sortBy];
    return COMPARATOR(leftBook, rightBook, finishDateByBookId);
}

/**
 * Returns a stably sorted copy of books for current toolbar sort controls.
 * @param books - Books to sort.
 * @param sortBy - Active sort key.
 * @param sortDirection - Ascending or descending direction.
 * @param finishDateByBookId - Finish-date lookup keyed by `book_id`.
 * @returns Sorted array copy suitable for rendering.
 */
export function sortBooks(
    books: Book[] = [],
    sortBy: SortBy = SORT_BY_TITLE,
    sortDirection: SortDirection = SORT_DIRECTION_ASC,
    finishDateByBookId: Record<string, string> = {},
): Book[] {
    let directionSign = 1;
    if (sortDirection === SORT_DIRECTION_DESC) {
        directionSign = -1;
    }
    return [...books].sort((leftBook, rightBook) => {
        const PRIMARY = compareBySortKey(
            leftBook,
            rightBook,
            sortBy,
            finishDateByBookId,
        );
        if (PRIMARY !== 0) {
            return PRIMARY * directionSign;
        }
        return compareTitleText(leftBook.title, rightBook.title);
    });
}
