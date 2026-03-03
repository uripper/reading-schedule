import type {
    Book,
    BookGroup,
    BookGroupBy,
    GroupBucket,
    GroupMeta,
} from "../../types/types.js";
import { finishDateMetaForBook } from "./grouping_finish.js";
import { shelfLabelForBook } from "./shelf.js";
import { titleInitialLetter } from "./title_key.js";

export const GROUP_BY_NONE = "none";
export const GROUP_BY_SHELF = "shelf";
export const GROUP_BY_FINISH_DATE = "finish_date";
export const GROUP_BY_TITLE_LETTER = "title_letter";
export const GROUP_BY_AUTHOR = "author";

const UNKNOWN_AUTHOR_LABEL = "Unknown Author";
const TITLE_MISC_LABEL = "#";
const TITLE_MISC_KEY = "title:#";

const TITLE_MISC_ORDER = 2;
const TITLE_LETTER_ORDER = 1;

/**
 * Normalizes optional text-like values for stable grouping keys.
 * @param value Raw value from book metadata.
 * @returns Trimmed string representation or empty string.
 */
function normalizedText(value?: string | number): string {
    return String(value ?? "").trim();
}

/**
 * Compares text values case-insensitively for deterministic ordering.
 * @param left Left text operand.
 * @param right Right text operand.
 * @returns Negative/zero/positive comparison result.
 */
function compareTextInsensitive(left: string, right: string): number {
    return String(left || "").localeCompare(String(right || ""), undefined, {
        sensitivity: "base",
    });
}

/**
 * Builds title-initial group metadata for one book.
 * @param book Book to classify.
 * @returns Group metadata keyed by title letter or misc bucket.
 */
function titleLetterMetaForBook(book: Book): GroupMeta {
    const FIRST = titleInitialLetter(book.title);
    if (!FIRST) {
        return {
            key: TITLE_MISC_KEY,
            label: TITLE_MISC_LABEL,
            order: TITLE_MISC_ORDER,
            tie: TITLE_MISC_LABEL,
        };
    }

    if (!/^[A-Z]$/.test(FIRST)) {
        return {
            key: TITLE_MISC_KEY,
            label: TITLE_MISC_LABEL,
            order: TITLE_MISC_ORDER,
            tie: TITLE_MISC_LABEL,
        };
    }

    return {
        key: `title:${FIRST}`,
        label: FIRST,
        order: TITLE_LETTER_ORDER,
        tie: FIRST,
    };
}

/**
 * Builds author group metadata for one book.
 * @param book Book to classify.
 * @returns Group metadata keyed by author name.
 */
function authorMetaForBook(book: Book): GroupMeta {
    const AUTHOR = normalizedText(book.author);
    if (!AUTHOR) {
        return {
            key: `author:${UNKNOWN_AUTHOR_LABEL}`,
            label: UNKNOWN_AUTHOR_LABEL,
            order: TITLE_LETTER_ORDER,
            tie: UNKNOWN_AUTHOR_LABEL,
        };
    }

    return {
        key: `author:${AUTHOR}`,
        label: AUTHOR,
        order: TITLE_LETTER_ORDER,
        tie: AUTHOR,
    };
}

/**
 * Builds shelf group metadata for one book.
 * @param book Book to classify.
 * @returns Group metadata keyed by display shelf label.
 */
function shelfMetaForBook(book: Book): GroupMeta {
    const SHELF_LABEL = shelfLabelForBook(book);
    return {
        key: `shelf:${SHELF_LABEL}`,
        label: SHELF_LABEL,
        order: TITLE_LETTER_ORDER,
        tie: SHELF_LABEL,
    };
}

/**
 * Resolves grouping metadata for one book under the active grouping mode.
 * @param book Book to classify.
 * @param groupBy Active grouping option.
 * @param finishDateByBookId Finish-date lookup keyed by `book_id`.
 * @param currentYear Calendar year used for relative finish-date labels.
 * @returns Group metadata used for bucket assignment and ordering.
 */
function metaForBook(
    book: Book,
    groupBy: BookGroupBy,
    finishDateByBookId: Record<string, string>,
    currentYear: number,
): GroupMeta {
    if (groupBy === GROUP_BY_SHELF) {
        return shelfMetaForBook(book);
    }
    if (groupBy === GROUP_BY_FINISH_DATE) {
        return finishDateMetaForBook(book, finishDateByBookId, currentYear);
    }
    if (groupBy === GROUP_BY_TITLE_LETTER) {
        return titleLetterMetaForBook(book);
    }
    return authorMetaForBook(book);
}

/**
 * Sorts group buckets by order, tie-break text, then visible label.
 * @param left Left group bucket.
 * @param right Right group bucket.
 * @returns Negative/zero/positive comparison result.
 */
function compareGroups(left: GroupBucket, right: GroupBucket): number {
    if (left.order !== right.order) {
        return left.order - right.order;
    }
    const TIE_COMPARE = compareTextInsensitive(left.tie, right.tie);
    if (TIE_COMPARE !== 0) {
        return TIE_COMPARE;
    }
    return compareTextInsensitive(left.label, right.label);
}

/**
 * Builds grouping buckets from books for the active grouping strategy.
 * @param books Books visible in the current view.
 * @param groupBy Active grouping option.
 * @param finishDateByBookId Finish-date lookup keyed by `book_id`.
 * @param currentYear Calendar year used for relative finish-date labels.
 * @returns Buckets keyed by grouping key, each containing matching books.
 */
function groupedBuckets(
    books: Book[],
    groupBy: BookGroupBy,
    finishDateByBookId: Record<string, string>,
    currentYear: number,
): Map<string, GroupBucket> {
    const BUCKETS = new Map<string, GroupBucket>();
    
    books.forEach((book: Book) => {
        const META = metaForBook(
            book,
            groupBy,
            finishDateByBookId,
            currentYear,
        );
        if (!BUCKETS.has(META.key)) {
            BUCKETS.set(META.key, { ...META, books: [] });
        }
        const BUCKET = BUCKETS.get(META.key);
        if (BUCKET) {
            BUCKET.books.push(book);
        }
    });
    return BUCKETS;
}

/**
 * Groups books for card-grid rendering when grouping is enabled.
 * @param books Books to group.
 * @param groupBy Active grouping option.
 * @param finishDateByBookId Finish-date lookup keyed by `book_id`.
 * @returns Ordered groups for sectioned grid rendering.
 */
export function groupBooks(
    books: Book[] = [],
    groupBy: BookGroupBy = GROUP_BY_NONE,
    finishDateByBookId: Record<string, string> = {},
): BookGroup[] {
    if (groupBy === GROUP_BY_NONE) {
        return [];
    }

    const CURRENT_YEAR = new Date().getFullYear();
    const BUCKETS = groupedBuckets(
        books,
        groupBy,
        finishDateByBookId,
        CURRENT_YEAR,
    );
    return [...BUCKETS.values()].sort(compareGroups).map((bucket) => ({
        books: bucket.books,
        key: bucket.key,
        label: bucket.label,
    }));
}
