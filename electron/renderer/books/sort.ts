import type {
    Book,
    OptionalNumber,
    OptionalString,
    SortBy,
    SortComparator,
    SortDirection,
} from "../../types/types.ts";
import { normalizeShelfName } from "./shelf.ts";
import { titleSortKey } from "./title_key.ts";

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

/**
 * Compares optional numbers with missing values sorted last.
 * @param left - Left numeric value.
 * @param right - Right numeric value.
 * @returns Negative/zero/positive comparison result.
 */
function compareNumbers(left: OptionalNumber, right: OptionalNumber): number {
    const MISSING_TEXT = handleMissingText(left, right);
    if (MISSING_TEXT !== null) {
        return MISSING_TEXT;
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
    const MISSING_TEXT = handleMissingText(left, right);
    if (MISSING_TEXT !== null) {
        return MISSING_TEXT;
    }
    const LEFT_TEXT = String(left ?? "")
        .trim()
        .toLowerCase();
    const RIGHT_TEXT = String(right ?? "")
        .trim()
        .toLowerCase();
    return LEFT_TEXT.localeCompare(RIGHT_TEXT, undefined, {
        sensitivity: "base",
    });
}

/**
 * Checks whether an optional numeric value should sort as missing.
 * @param value - Numeric candidate.
 * @returns `true` when the value is nullish.
 */
function isMissingNumber(value: OptionalNumber): boolean {
    return value === null || value === undefined;
}

/**
 * Checks whether an optional text value should sort as missing.
 * @param value - Text candidate.
 * @returns `true` when the value is blank or nullish.
 */
function isMissingString(value: OptionalString): boolean {
    return value === null || value === undefined || value.trim() === "";
}

/**
 * Decides whether a comparison should use numeric missing-value rules.
 * @param left - Left value.
 * @param right - Right value.
 * @returns `true` when either side is numeric.
 */
function isNumericComparison(
    left: OptionalString | OptionalNumber,
    right: OptionalString | OptionalNumber,
): boolean {
    return typeof left === "number" || typeof right === "number";
}

/**
 * Converts missing-value flags into a sort result.
 * @param leftMissing - Whether the left value is missing.
 * @param rightMissing - Whether the right value is missing.
 * @returns Sort result when at least one side is missing, otherwise `null`.
 */
function missingValueResult(
    leftMissing: boolean,
    rightMissing: boolean,
): number | null {
    if (leftMissing && rightMissing) {
        return 0;
    }
    if (leftMissing) {
        return 1;
    }
    if (rightMissing) {
        return -1;
    }
    return null;
}

/**
 * Determine which of two optional string or number values is considered "missing".
 * @example
 * handleMissingText(null, "text")
 * 1
 * @param {OptionalString|OptionalNumber} left - Left value; strings are missing if null/undefined/trim() === "" and numbers are missing if null/undefined.
 * @param {OptionalString|OptionalNumber} right - Right value; strings are missing if null/undefined/trim() === "" and numbers are missing if null/undefined.
 * @returns {number|null} Return 0 if both missing, 1 if left is missing, -1 if right is missing, or null if neither is missing.
 **/
function handleMissingText(
    left: OptionalString | OptionalNumber,
    right: OptionalString | OptionalNumber,
): number | null {
    const USES_NUMBERS = isNumericComparison(left, right);
    let leftMissing = false;
    let rightMissing = false;

    if (USES_NUMBERS) {
        leftMissing = isMissingNumber(left as OptionalNumber);
        rightMissing = isMissingNumber(right as OptionalNumber);
    } else {
        leftMissing = isMissingString(left as OptionalString);
        rightMissing = isMissingString(right as OptionalString);
    }
    return missingValueResult(leftMissing, rightMissing);
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
    return [...books].sort(
        bookComparator(sortBy, sortDirection, finishDateByBookId),
    );
}
