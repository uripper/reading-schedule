import type { Book, GroupMeta } from "../../types/types.js";

const MONTH_INDEX_MIN = 1;
const MONTH_INDEX_MAX = 12;
const YEAR_MONTH_MULTIPLIER = 100;
const ISO_DATE_PART_COUNT = 3;

const NO_ESTIMATED_FINISH_KEY = "finish:none";
const NO_ESTIMATED_FINISH_LABEL = "No estimated finish";
const NO_ESTIMATED_FINISH_ORDER = Number.MAX_SAFE_INTEGER;

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat(undefined, {
    month: "long",
});

/**
 * Parses `YYYY-MM-DD` finish dates into grouping metadata parts.
 * @param dateText - Finish date text.
 * @returns Parsed year/month/date parts or `null` when invalid.
 */
function parseFinishDateParts(
    dateText?: string,
): { year: number; month: number; date: Date } | null {
    const RAW = String(dateText ?? "").trim();
    if (!RAW) {
        return null;
    }

    const PARTS = RAW.split("-");
    if (PARTS.length !== ISO_DATE_PART_COUNT) {
        return null;
    }

    const YEAR = Number(PARTS[0]);
    const MONTH = Number(PARTS[1]);
    if (!Number.isInteger(YEAR) || !Number.isInteger(MONTH)) {
        return null;
    }
    if (MONTH < MONTH_INDEX_MIN || MONTH > MONTH_INDEX_MAX) {
        return null;
    }

    return {
        date: new Date(YEAR, MONTH - MONTH_INDEX_MIN, MONTH_INDEX_MIN),
        month: MONTH,
        year: YEAR,
    };
}

/**
 * Builds finish-date grouping metadata for one book.
 * @param book - Book being grouped.
 * @param finishDateByBookId - Finish-date lookup keyed by `book_id`.
 * @param currentYear - Current calendar year for short labels.
 * @returns Group metadata for finish date or no-estimate bucket.
 */
export function finishDateMetaForBook(
    book: Book,
    finishDateByBookId: Record<string, string>,
    currentYear: number,
): GroupMeta {
    const FINISH_DATE = parseFinishDateParts(finishDateByBookId[book.book_id]);
    if (!FINISH_DATE) {
        return {
            key: NO_ESTIMATED_FINISH_KEY,
            label: NO_ESTIMATED_FINISH_LABEL,
            order: NO_ESTIMATED_FINISH_ORDER,
            tie: NO_ESTIMATED_FINISH_LABEL,
        };
    }

    const MONTH_LABEL = MONTH_LABEL_FORMATTER.format(FINISH_DATE.date);
    let label = MONTH_LABEL;
    if (FINISH_DATE.year !== currentYear) {
        label = `${MONTH_LABEL} ${FINISH_DATE.year}`;
    }

    return {
        key: `finish:${FINISH_DATE.year}-${String(FINISH_DATE.month).padStart(2, "0")}`,
        label,
        order: FINISH_DATE.year * YEAR_MONTH_MULTIPLIER + FINISH_DATE.month,
        tie: label,
    };
}
