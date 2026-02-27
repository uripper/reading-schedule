import { finishDatesByBookId } from "../books/finish_dates.js";
import { BOOK_STATUS_DROPPED, BOOK_STATUS_IN_PROGRESS, BOOK_STATUS_READ, BOOK_STATUS_TO_READ } from "../books/status.js";
import { sessionKeyFor } from "../calendar/utils.js";
import { todayKey } from "../sessions/utils.js";
import type { Book, PlannerResult } from "../../types/types.js";
import type { StatusBreakdown } from "../../types/types_stats.js";

const MONTHS_PER_YEAR = 12;
const PERCENT_MAX = 100;
const DATE_YEAR_START_INDEX = 0;
const DATE_YEAR_END_INDEX = 4;
const DATE_MONTH_START_INDEX = 5;
const DATE_MONTH_END_INDEX = 7;
const MIN_MONTH_NUMBER = 1;
const MONTH_NUMBER_TO_INDEX_OFFSET = 1;

/**
 * Parses year component from a `YYYY-MM-DD` date key.
 * @param dateText Date key text.
 * @returns Parsed year, or null when invalid.
 */
export function yearFromDateKey(dateText: string): number | null {
  const key = String(dateText || "").trim();
  if (key.length < DATE_YEAR_END_INDEX) {
    return null;
  }
  const parsed = Number(key.slice(DATE_YEAR_START_INDEX, DATE_YEAR_END_INDEX));
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

/**
 * Parses zero-based month index from a `YYYY-MM-DD` date key.
 * @param dateText Date key text.
 * @returns Month index in `[0, 11]`, or null when invalid.
 */
export function monthIndexFromDateKey(dateText: string): number | null {
  const key = String(dateText || "").trim();
  const parsed = Number(
    key.slice(DATE_MONTH_START_INDEX, DATE_MONTH_END_INDEX),
  );
  if (!Number.isInteger(parsed)) {
    return null;
  }
  if (parsed < MIN_MONTH_NUMBER || parsed > MONTHS_PER_YEAR) {
    return null;
  }
  return parsed - MONTH_NUMBER_TO_INDEX_OFFSET;
}

/**
 * Counts books by status for dashboard status distribution.
 * @param books Book catalog.
 * @returns Status-to-count breakdown.
 */
export function statusBreakdown(books: Book[]): StatusBreakdown {
  const counts: StatusBreakdown = {
    [BOOK_STATUS_TO_READ]: 0,
    [BOOK_STATUS_IN_PROGRESS]: 0,
    [BOOK_STATUS_READ]: 0,
    [BOOK_STATUS_DROPPED]: 0,
  };
  books.forEach((book) => {
    counts[book.status] += 1;
  });
  return counts;
}

/**
 * Collects ids of books marked read and finished in the target year.
 * @param books Book catalog.
 * @param year Target year.
 * @returns Set of read book ids finished that year.
 */
export function readBooksFinishedThisYear(
  books: Book[],
  year: number,
): Set<string> {
  const ids = new Set<string>();
  books.forEach((book) => {
    if (book.status !== BOOK_STATUS_READ) {
      return;
    }
    const finishedYear = yearFromDateKey(String(book.finished_at ?? ""));
    if (finishedYear !== year) {
      return;
    }
    ids.add(book.book_id);
  });
  return ids;
}

/**
 * Collects planned finish ids/months from planner output for a target year.
 * @param lastResult Latest planner result.
 * @param year Target year.
 * @returns Planned finish ids and month index map keyed by book id.
 */
export function plannedFinishBookIds(
  lastResult: PlannerResult | null,
  year: number,
): { ids: Set<string>; monthByBookId: Map<string, number> } {
  const ids = new Set<string>();
  const monthByBookId = new Map<string, number>();
  const rows = lastResult?.schedule ?? [];
  const byBookId = finishDatesByBookId(rows);
  const perBookSummary = lastResult?.summary?.per_book ?? {};

  Object.entries(byBookId).forEach(([bookId, dateKey]) => {
    const finishYear = yearFromDateKey(dateKey);
    if (finishYear !== year) {
      return;
    }
    if (Object.hasOwn(perBookSummary, bookId)) {
      const summary = perBookSummary[bookId];
      if (summary.finished === false) {
        return;
      }
    }
    const monthIndex = monthIndexFromDateKey(dateKey);
    if (monthIndex === null) {
      return;
    }
    ids.add(bookId);
    monthByBookId.set(bookId, monthIndex);
  });
  return { ids, monthByBookId };
}

/**
 * Computes completion-rate stats for rows scheduled through today in target year.
 * @param lastResult Latest planner result.
 * @param scheduleCompletions Completion map keyed by schedule row.
 * @param year Target year.
 * @returns Scheduled/completed counts and rounded completion rate percent.
 */
export function completionStats(
  lastResult: PlannerResult | null,
  scheduleCompletions: Record<string, boolean>,
  year: number,
): { scheduled: number; completed: number; ratePercent: number } {
  const rows = lastResult?.schedule ?? [];
  const today = todayKey();
  let scheduled = 0;
  let completed = 0;

  rows.forEach((row) => {
    const rowYear = yearFromDateKey(String(row.date || ""));
    if (rowYear !== year) {
      return;
    }
    const rowDate = String(row.date || "");
    if (!rowDate || Number(rowDate) > Number(today)) {
      return;
    }
    scheduled += 1;
    if (scheduleCompletions[sessionKeyFor(row)]) {
      completed += 1;
    }
  });

  if (!scheduled) {
    return { scheduled, completed, ratePercent: 0 };
  }
  const rawPercent = (completed / scheduled) * PERCENT_MAX;
  return {
    scheduled,
    completed,
    ratePercent: Math.round(rawPercent),
  };
}

/**
 * Computes average progress percentage and started-book count.
 * @param books Book catalog.
 * @returns Aggregate progress metrics.
 */
export function averageProgress(books: Book[]): {
  startedCount: number;
  averagePercent: number;
} {
  if (!books.length) {
    return { startedCount: 0, averagePercent: 0 };
  }
  let startedCount = 0;
  let totalPercent = 0;
  books.forEach((book) => {
    const progress = Number(book.progress_percent || 0);
    if (progress > 0) {
      startedCount += 1;
    }
    totalPercent += progress;
  });
  return {
    startedCount,
    averagePercent: Math.round((totalPercent / books.length) * 10) / 10,
  };
}

/**
 * Computes monthly finish counts from planned and completed finishes.
 * @param readThisYearIds Set of books completed in target year.
 * @param books Book catalog.
 * @param plannedMonths Planned finish month index by book id.
 * @returns Array of 12 monthly finish totals.
 */
export function monthlyFinishCounts(
  readThisYearIds: Set<string>,
  books: Book[],
  plannedMonths: Map<string, number>,
): number[] {
  const counts = Array.from({ length: MONTHS_PER_YEAR }, () => 0);
  plannedMonths.forEach((monthIndex) => {
    counts[monthIndex] += 1;
  });
  books.forEach((book) => {
    if (!readThisYearIds.has(book.book_id)) {
      return;
    }
    const monthIndex = monthIndexFromDateKey(String(book.finished_at ?? ""));
    if (monthIndex === null) {
      return;
    }
    counts[monthIndex] += 1;
  });
  return counts;
}
