import type { Book, PlannerScheduleRow } from "../../types/types.js";

const SESSION_INDEX_PAD = 3;

/**
 * Builds sortable key for schedule rows using date and padded session index.
 * @param row - Planner schedule row.
 * @returns Lexicographically sortable row key.
 */
function rowSortKey(row: PlannerScheduleRow): string {
    const INDEX = String(row.session_index || 0).padStart(
        SESSION_INDEX_PAD,
        "0",
    );
    return `${String(row.date || "")}-${INDEX}`;
}

/**
 * Returns schedule rows sorted by date and session index.
 * @param rows - Planner schedule rows.
 * @returns Sorted rows copy.
 */
function sortRows(rows: PlannerScheduleRow[] = []): PlannerScheduleRow[] {
    return [...rows].sort((left, right) => {
        return rowSortKey(left).localeCompare(rowSortKey(right));
    });
}

/**
 * Overlays explicit read completion dates onto derived finish-date map.
 * @param finishDateByBookId - Derived finish-date lookup map.
 * @param books - Books collection with possible `finished_at` values.
 * @returns Finish-date map where explicit read dates take precedence.
 */
function withBookFinishedDates(
    finishDateByBookId: Record<string, string>,
    books: Book[] = [],
): Record<string, string> {
    const OUT = { ...finishDateByBookId };

    for (const BOOK of books) {
        const BOOK_ID = String(BOOK.book_id || "");
        const FINISHED_AT = String(BOOK.finished_at ?? "");
        if (!BOOK_ID || !FINISHED_AT) {
            continue;
        }
        // For read books, explicit completion date should win over schedule estimates.
        OUT[BOOK_ID] = FINISHED_AT;
    }
    return OUT;
}

/**
 * Builds estimated finish-date lookup keyed by `book_id`.
 * @param rows - Planner schedule rows.
 * @param books - Books collection used to overlay explicit read dates.
 * @returns Finish-date map for books grid sorting/grouping.
 */
export function finishDatesByBookId(
    rows: PlannerScheduleRow[] = [],
    books: Book[] = [],
): Record<string, string> {
    const OUT: Record<string, string> = {};

    for (const ROW of sortRows(rows)) {
        const BOOK_ID = String(ROW.book_id || "");
        const DATE = String(ROW.date || "");
        if (!BOOK_ID || !DATE) {
            continue;
        }
        OUT[BOOK_ID] = DATE;
    }
    return withBookFinishedDates(OUT, books);
}
