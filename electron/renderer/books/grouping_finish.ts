import type { Book, GroupMeta } from "../../types/types.ts";

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

function parsedYearMonth(
    dateText?: string,
): { year: number; month: number } | null {
    const RAW = String(dateText ?? "").trim();
    if (RAW === "") {
        return null;
    }
    const PARTS = RAW.split("-");
    if (PARTS.length !== ISO_DATE_PART_COUNT) {
        return null;
    }
    return {
        month: Number(PARTS[1]),
        year: Number(PARTS[0]),
    };
}

function hasValidYearMonth(year: number, month: number): boolean {
    if (!Number.isInteger(year) || !Number.isInteger(month)) {
        return false;
    }
    return month >= MONTH_INDEX_MIN && month <= MONTH_INDEX_MAX;
}

/**
 * Parses `YYYY-MM-DD` finish dates into grouping metadata parts.
 * @param dateText - Finish date text.
 * @returns Parsed year/month/date parts or `null` when invalid.
 */
function parseFinishDateParts(
    dateText?: string,
): { year: number; month: number; date: Date } | null {
    const YEAR_MONTH = parsedYearMonth(dateText);
    if (YEAR_MONTH === null) {
        return null;
    }
    if (!hasValidYearMonth(YEAR_MONTH.year, YEAR_MONTH.month)) {
        return null;
    }
    return {
        date: new Date(
            YEAR_MONTH.year,
            YEAR_MONTH.month - MONTH_INDEX_MIN,
            MONTH_INDEX_MIN,
        ),
        month: YEAR_MONTH.month,
        year: YEAR_MONTH.year,
    };
}

function noEstimatedFinishMeta(): GroupMeta {
    return {
        key: NO_ESTIMATED_FINISH_KEY,
        label: NO_ESTIMATED_FINISH_LABEL,
        order: NO_ESTIMATED_FINISH_ORDER,
        tie: NO_ESTIMATED_FINISH_LABEL,
    };
}

function finishDateLabel(
    finishDate: NonNullable<ReturnType<typeof parseFinishDateParts>>,
    currentYear: number,
): string {
    const MONTH_LABEL = MONTH_LABEL_FORMATTER.format(finishDate.date);
    if (finishDate.year === currentYear) {
        return MONTH_LABEL;
    }
    return `${MONTH_LABEL} ${finishDate.year}`;
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
        return noEstimatedFinishMeta();
    }
    const LABEL = finishDateLabel(FINISH_DATE, currentYear);
    return {
        key: `finish:${FINISH_DATE.year}-${String(FINISH_DATE.month).padStart(2, "0")}`,
        label: LABEL,
        order: FINISH_DATE.year * YEAR_MONTH_MULTIPLIER + FINISH_DATE.month,
        tie: LABEL,
    };
}
