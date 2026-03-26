import type { Book, PlannerScheduleRow } from "../../types/types.ts";
import { sortedRows } from "../app/schedule_preserve.ts";

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
        const ENTRY = finishedBookEntry(BOOK);
        if (ENTRY === null) {
            continue;
        }
        // For read books, explicit completion date should win over schedule estimates.
        OUT[ENTRY.bookId] = ENTRY.finishedAt;
    }
    return OUT;
}

function finishedBookEntry(
    book: Book,
): { bookId: string; finishedAt: string } | null {
    const BOOK_ID = String(book.book_id || "");
    const FINISHED_AT = String(book.finished_at ?? "");
    if (BOOK_ID === "" || FINISHED_AT === "") {
        return null;
    }
    return { bookId: BOOK_ID, finishedAt: FINISHED_AT };
}

function scheduledFinishEntry(
    row: PlannerScheduleRow,
): { bookId: string; date: string } | null {
    const BOOK_ID = String(row.book_id || "");
    const DATE = String(row.date || "");
    if (BOOK_ID === "" || DATE === "") {
        return null;
    }
    return { bookId: BOOK_ID, date: DATE };
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

    for (const ROW of sortedRows(rows)) {
        const ENTRY = scheduledFinishEntry(ROW);
        if (ENTRY === null) {
            continue;
        }
        OUT[ENTRY.bookId] = ENTRY.date;
    }
    return withBookFinishedDates(OUT, books);
}
