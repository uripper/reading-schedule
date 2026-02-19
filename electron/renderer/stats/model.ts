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
import type { Session } from "../sessions/normalize.js";
import { isoLocalDayKey, streakFromSessions, todayKey } from "../sessions/utils.js";
import type { PlannerResult } from "../app/types.js";

const MONTHS_PER_YEAR = 12;
const PERCENT_MAX = 100;

export type StatusBreakdown = Record<BookStatus, number>;

export type StatsSnapshot = {
  year: number;
  totalBooks: number;
  booksStartedCount: number;
  averageProgressPercent: number;
  plannedFinishCount: number;
  finishedThisYearCount: number;
  projectedFinishCount: number;
  readingMinutesYear: number;
  activeDaysYear: number;
  currentStreakDays: number;
  scheduledSessionsToDate: number;
  completedSessionsToDate: number;
  completionRatePercent: number;
  statusBreakdown: StatusBreakdown;
  monthlyFinishes: number[];
};

type SnapshotInputs = {
  books: Book[];
  sessions: Session[];
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
};

function yearFromDateKey(dateText: string): number | null {
  const key = String(dateText || "").trim();
  if (key.length < 4) {
    return null;
  }
  const parsed = Number(key.slice(0, 4));
  if (!Number.isInteger(parsed)) {
    return null;
  }
  return parsed;
}

function monthIndexFromDateKey(dateText: string): number | null {
  const key = String(dateText || "").trim();
  const parsed = Number(key.slice(5, 7));
  if (!Number.isInteger(parsed)) {
    return null;
  }
  if (parsed < 1 || parsed > MONTHS_PER_YEAR) {
    return null;
  }
  return parsed - 1;
}

function blankStatusBreakdown(): StatusBreakdown {
  return {
    [BOOK_STATUS_TO_READ]: 0,
    [BOOK_STATUS_IN_PROGRESS]: 0,
    [BOOK_STATUS_READ]: 0,
    [BOOK_STATUS_DROPPED]: 0,
  };
}

function statusBreakdown(books: Book[]): StatusBreakdown {
  const counts = blankStatusBreakdown();
  books.forEach((book) => {
    counts[book.status] += 1;
  });
  return counts;
}

function readBooksFinishedThisYear(books: Book[], year: number): Set<string> {
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

function plannedFinishBookIds(
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
    if (summary && summary.finished === false) {
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

function completionStats(
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

function readingStats(sessions: Session[], year: number): { minutes: number; activeDays: number; streakDays: number } {
  let minutes = 0;
  const activeDaySet = new Set<string>();
  sessions.forEach((session) => {
    const dayKey = isoLocalDayKey(session.ended_at);
    const endedYear = yearFromDateKey(dayKey);
    if (endedYear !== year) {
      return;
    }
    activeDaySet.add(dayKey);
    minutes += Number(session.minutes || 0);
  });
  return {
    minutes,
    activeDays: activeDaySet.size,
    streakDays: streakFromSessions(sessions),
  };
}

function averageProgress(books: Book[]): { startedCount: number; averagePercent: number } {
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

function monthlyFinishCounts(
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

export function buildStatsSnapshot({
  books,
  sessions,
  lastResult,
  scheduleCompletions,
}: SnapshotInputs): StatsSnapshot {
  const year = new Date().getFullYear();
  const reading = readingStats(sessions, year);
  const progress = averageProgress(books);
  const completion = completionStats(lastResult, scheduleCompletions, year);
  const readThisYearIds = readBooksFinishedThisYear(books, year);
  const planned = plannedFinishBookIds(lastResult, year);
  const projected = new Set([...readThisYearIds, ...planned.ids]);

  return {
    year,
    totalBooks: books.length,
    booksStartedCount: progress.startedCount,
    averageProgressPercent: progress.averagePercent,
    plannedFinishCount: planned.ids.size,
    finishedThisYearCount: readThisYearIds.size,
    projectedFinishCount: projected.size,
    readingMinutesYear: reading.minutes,
    activeDaysYear: reading.activeDays,
    currentStreakDays: reading.streakDays,
    scheduledSessionsToDate: completion.scheduled,
    completedSessionsToDate: completion.completed,
    completionRatePercent: completion.ratePercent,
    statusBreakdown: statusBreakdown(books),
    monthlyFinishes: monthlyFinishCounts(readThisYearIds, books, planned.monthByBookId),
  };
}
