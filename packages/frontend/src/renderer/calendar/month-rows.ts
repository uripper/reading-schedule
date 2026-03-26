import type { CalendarDisplayRow } from "../../types/types.ts";

/**
 * Normalizes unknown book ids to the string keys used by month-row helpers.
 * @param bookId - Raw book id value from a calendar row.
 * @returns A string book id or an empty string when the value is unusable.
 */
function validBookId(bookId: unknown): string {
    if (typeof bookId !== "string") {
        return "";
    }
    return bookId;
}

/**
 * Indexes completed-book rows by book id so planned rows can inherit finish state.
 * @param completedBookRows - Completed rows synthesized for a given day.
 * @returns Completed rows keyed by book id.
 */
function completedRowsByBookId(
    completedBookRows: CalendarDisplayRow[],
): Map<string, CalendarDisplayRow> {
    const CompletedByBookId = new Map<string, CalendarDisplayRow>();
    for (const Row of completedBookRows) {
        const BookId = validBookId(Row.book_id);
        if (BookId === "" || CompletedByBookId.has(BookId)) {
            continue;
        }
        CompletedByBookId.set(BookId, Row);
    }
    return CompletedByBookId;
}

/**
 * Moves finish rows to the front so completion markers render before ordinary sessions.
 * @param rows - Rows already prepared for display.
 * @returns Rows ordered with finished books first.
 */
function finishFirstRows(rows: CalendarDisplayRow[]): CalendarDisplayRow[] {
    const FinishRows: CalendarDisplayRow[] = [];
    const OtherRows: CalendarDisplayRow[] = [];
    for (const Row of rows) {
        if (Row.finish === true) {
            FinishRows.push(Row);
            continue;
        }
        OtherRows.push(Row);
    }
    return [...FinishRows, ...OtherRows];
}

/**
 * Collects completed-book rows that were not already represented by planned rows.
 * @param completedByBookId - Completed rows keyed by book id.
 * @param seenBookIds - Book ids already encountered while processing planned rows.
 * @returns Standalone completed rows that still need to be displayed.
 */
function missingCompletedRows(
    completedByBookId: Map<string, CalendarDisplayRow>,
    seenBookIds: Set<string>,
): CalendarDisplayRow[] {
    const MissingCompletedRowsList: CalendarDisplayRow[] = [];
    for (const [BookId, Row] of completedByBookId.entries()) {
        if (seenBookIds.has(BookId)) {
            continue;
        }
        MissingCompletedRowsList.push(Row);
    }
    return MissingCompletedRowsList;
}

/**
 * Marks a planned row as finished when the same book has a completed row for the day.
 * @param row - Planned display row to normalize.
 * @param completedByBookId - Completed rows keyed by book id.
 * @returns The normalized row plus the book id used for tracking.
 */
function processedReadingRow(
    row: CalendarDisplayRow,
    completedByBookId: Map<string, CalendarDisplayRow>,
): { bookId: string; row: CalendarDisplayRow } {
    const BookId = validBookId(row.book_id);
    if (BookId === "" || !completedByBookId.has(BookId)) {
        return { bookId: BookId, row };
    }
    return {
        bookId: BookId,
        row: {
            ...row,
            finish: true,
        },
    };
}

/**
 * Applies finish markers to planned rows and tracks which books were already shown.
 * @param plannedRows - Planned calendar rows for the day.
 * @param completedByBookId - Completed rows keyed by book id.
 * @returns Processed rows plus the set of seen book ids.
 */
function processReadingRows(
    plannedRows: CalendarDisplayRow[],
    completedByBookId: Map<string, CalendarDisplayRow>,
): { out: CalendarDisplayRow[]; seenBookIds: Set<string> } {
    const Out: CalendarDisplayRow[] = [];
    const SeenBookIds = new Set<string>();

    for (const Row of plannedRows) {
        const ProcessedRow = processedReadingRow(Row, completedByBookId);
        Out.push(ProcessedRow.row);
        if (ProcessedRow.bookId !== "") {
            SeenBookIds.add(ProcessedRow.bookId);
        }
    }
    return { out: Out, seenBookIds: SeenBookIds };
}

/**
 * Adds finish rows for books completed on this date without scheduled sessions.
 * @param plannedRows - Existing scheduled rows for the date.
 * @param completedBookRows - Synthetic completed-book rows.
 * @returns Combined rows for month-grid display.
 */
export function mergeDisplayRows(
    plannedRows: CalendarDisplayRow[],
    completedBookRows: CalendarDisplayRow[],
): CalendarDisplayRow[] {
    const CompletedByBookId = completedRowsByBookId(completedBookRows);
    const ProcessedRows = processReadingRows(plannedRows, CompletedByBookId);
    return finishFirstRows([
        ...ProcessedRows.out,
        ...missingCompletedRows(CompletedByBookId, ProcessedRows.seenBookIds),
    ]);
}
