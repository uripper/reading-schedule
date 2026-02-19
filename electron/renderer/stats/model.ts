import type { Book } from "../books/types.js";
import type { Session } from "../sessions/normalize.js";
import type { PlannerResult } from "../app/types.js";
import {
  averageProgress,
  completionStats,
  monthlyFinishCounts,
  plannedFinishBookIds,
  readBooksFinishedThisYear,
  readingStats,
  statusBreakdown,
  type StatusBreakdown,
} from "./helpers.js";

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
