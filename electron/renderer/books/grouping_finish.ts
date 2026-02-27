import type { Book } from "./types.js";
import type { GroupMeta } from "../../types/books_types.js";

const MONTH_INDEX_MIN = 1;
const MONTH_INDEX_MAX = 12;
const YEAR_MONTH_MULTIPLIER = 100;
const ISO_DATE_PART_COUNT = 3;

const NO_ESTIMATED_FINISH_KEY = "finish:none";
const NO_ESTIMATED_FINISH_LABEL = "No estimated finish";
const NO_ESTIMATED_FINISH_ORDER = Number.MAX_SAFE_INTEGER;

const monthLabelFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
});

/**
 * Parses `YYYY-MM-DD` finish dates into grouping metadata parts.
 * @param dateText Finish date text.
 * @returns Parsed year/month/date parts or `null` when invalid.
 */
function parseFinishDateParts(
  dateText?: string,
): { year: number; month: number; date: Date } | null {
  const raw = String(dateText ?? "").trim();
  if (!raw) {
    return null;
  }

  const parts = raw.split("-");
  if (parts.length !== ISO_DATE_PART_COUNT) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }
  if (month < MONTH_INDEX_MIN || month > MONTH_INDEX_MAX) {
    return null;
  }

  return {
    year,
    month,
    date: new Date(year, month - MONTH_INDEX_MIN, MONTH_INDEX_MIN),
  };
}

/**
 * Builds finish-date grouping metadata for one book.
 * @param book Book being grouped.
 * @param finishDateByBookId Finish-date lookup keyed by `book_id`.
 * @param currentYear Current calendar year for short labels.
 * @returns Group metadata for finish date or no-estimate bucket.
 */
export function finishDateMetaForBook(
  book: Book,
  finishDateByBookId: Record<string, string>,
  currentYear: number,
): GroupMeta {
  const finishDate = parseFinishDateParts(finishDateByBookId[book.book_id]);
  if (!finishDate) {
    return {
      key: NO_ESTIMATED_FINISH_KEY,
      label: NO_ESTIMATED_FINISH_LABEL,
      order: NO_ESTIMATED_FINISH_ORDER,
      tie: NO_ESTIMATED_FINISH_LABEL,
    };
  }

  const monthLabel = monthLabelFormatter.format(finishDate.date);
  let label = monthLabel;
  if (finishDate.year !== currentYear) {
    label = `${monthLabel} ${finishDate.year}`;
  }

  return {
    label,
    key: `finish:${finishDate.year}-${String(finishDate.month).padStart(2, "0")}`,
    order: finishDate.year * YEAR_MONTH_MULTIPLIER + finishDate.month,
    tie: label,
  };
}
