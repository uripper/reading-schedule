import { finishDatesByBookId } from "../books/finish_dates.js";
import {
  BOOK_STATUS_DROPPED,
  BOOK_STATUS_IN_PROGRESS,
  BOOK_STATUS_READ,
  BOOK_STATUS_TO_READ,
  type BookStatus,
} from "../books/status.js";
import type { Book } from "../books/types.js";
import { sessionKeyFor } from "../calendar/utils.js";
import { todayKey } from "../sessions/utils.js";
import type { PlannerResult } from "../app/types.js";

const MONTHS_PER_YEAR = 12;
const PERCENT_MAX = 100;
const DATE_YEAR_START_INDEX = 0;
const DATE_YEAR_END_INDEX = 4;
const DATE_MONTH_START_INDEX = 5;
const DATE_MONTH_END_INDEX = 7;
const MIN_MONTH_NUMBER = 1;
const MONTH_NUMBER_TO_INDEX_OFFSET = 1;

export type StatusBreakdown = Record<BookStatus, number>;

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

export function monthIndexFromDateKey(dateText: string): number | null {
  const key = String(dateText || "").trim();
  const parsed = Number(key.slice(DATE_MONTH_START_INDEX, DATE_MONTH_END_INDEX));
  if (!Number.isInteger(parsed)) {
    return null;
  }
  if (parsed < MIN_MONTH_NUMBER || parsed > MONTHS_PER_YEAR) {
    return null;
  }
  return parsed - MONTH_NUMBER_TO_INDEX_OFFSET;
}

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

export function readBooksFinishedThisYear(books: Book[], year: number): Set<string> {
  const ids = new Set<string>();
  books.forEach((book) => {
    if (book.status !== BOOK_STATUS_READ) {
      return;
    }
    const finishedYear = yearFromDateKey(String(book.finished_at || ""));
    if (finishedYear !== year) {
      return;
    }
    ids.add(book.book_id);
  });
  return ids;
}

export function plannedFinishBookIds(
  lastResult: PlannerResult | null,
  year: number,
): { ids: Set<string>; monthByBookId: Map<string, number> } {
  const ids = new Set<string>();
  const monthByBookId = new Map<string, number>();
  const rows = lastResult?.schedule || [];
  const byBookId = finishDatesByBookId(rows);
  const perBookSummary = lastResult?.summary?.per_book || {};

  Object.entries(byBookId).forEach(([bookId, dateKey]) => {
    const finishYear = yearFromDateKey(dateKey);
    if (finishYear !== year) {
      return;
    }
    const summary = perBookSummary[bookId];
    if (summary?.finished === false) {
      return;
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

export function completionStats(
  lastResult: PlannerResult | null,
  scheduleCompletions: Record<string, boolean>,
  year: number,
): { scheduled: number; completed: number; ratePercent: number } {
  const rows = lastResult?.schedule || [];
  const today = todayKey();
  let scheduled = 0;
  let completed = 0;

  rows.forEach((row) => {
    const rowYear = yearFromDateKey(String(row.date || ""));
    if (rowYear !== year) {
      return;
    }
    const rowDate = String(row.date || "");
    if (!rowDate || rowDate > today) {
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

export function averageProgress(books: Book[]): { startedCount: number; averagePercent: number } {
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
    const monthIndex = monthIndexFromDateKey(String(book.finished_at || ""));
    if (monthIndex === null) {
      return;
    }
    counts[monthIndex] += 1;
  });
  return counts;
}
