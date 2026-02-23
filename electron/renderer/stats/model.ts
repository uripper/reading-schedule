import type { Book } from "../books/types.js";
import type { Session } from "../sessions/normalize.js";
import type { PlannerResult } from "../app/types.js";
import {
  activeDayCount,
  dayMinutesFromActivity,
  streakFromDayMinutes,
  totalMinutes,
} from "../activity/day_minutes.js";
import {
  averageProgress,
  completionStats,
  monthlyFinishCounts,
  plannedFinishBookIds,
  readBooksFinishedThisYear,
  statusBreakdown,
  type StatusBreakdown,
} from "./helpers.js";

const MIN_GOAL_MINUTES = 1;

export interface StatsSnapshot {
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
}

interface SnapshotInputs {
  books: Book[];
  sessions: Session[];
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  dailyGoalMinutes?: number;
}

/**
 * Normalizes daily goal minutes to a minimum valid value.
 * @param goalMinutes Optional goal minutes input.
 * @returns Goal minutes clamped to at least 1.
 */
function normalizedGoalMinutes(goalMinutes: number | undefined): number {
  return Math.max(MIN_GOAL_MINUTES, Number(goalMinutes ?? MIN_GOAL_MINUTES));
}

/**
 * Builds a full stats snapshot used by the Stats dashboard renderer.
 * @param root0 Snapshot input values.
 * @param root0.books Current book catalog.
 * @param root0.sessions Logged reading sessions.
 * @param root0.lastResult Latest planner result.
 * @param root0.scheduleCompletions Completion map keyed by schedule row.
 * @param root0.dailyGoalMinutes Optional daily goal minutes.
 * @returns Aggregated stats snapshot for rendering.
 */
export function buildStatsSnapshot({
  books,
  sessions,
  lastResult,
  scheduleCompletions,
  dailyGoalMinutes,
}: SnapshotInputs): StatsSnapshot {
  const year = new Date().getFullYear();
  const minutesByDayThisYear = dayMinutesFromActivity({
    sessions,
    lastResult,
    scheduleCompletions,
    year,
  });
  const minutesByDayAllTime = dayMinutesFromActivity({
    sessions,
    lastResult,
    scheduleCompletions,
    year: null,
  });
  const progress = averageProgress(books);
  const completion = completionStats(lastResult, scheduleCompletions, year);
  const readThisYearIds = readBooksFinishedThisYear(books, year);
  const planned = plannedFinishBookIds(lastResult, year);
  const projected = new Set([...readThisYearIds, ...planned.ids]);
  const goalMinutes = normalizedGoalMinutes(dailyGoalMinutes);

  return {
    year,
    totalBooks: books.length,
    booksStartedCount: progress.startedCount,
    averageProgressPercent: progress.averagePercent,
    plannedFinishCount: planned.ids.size,
    finishedThisYearCount: readThisYearIds.size,
    projectedFinishCount: projected.size,
    readingMinutesYear: totalMinutes(minutesByDayThisYear),
    activeDaysYear: activeDayCount(minutesByDayThisYear),
    currentStreakDays: streakFromDayMinutes(minutesByDayAllTime, goalMinutes),
    scheduledSessionsToDate: completion.scheduled,
    completedSessionsToDate: completion.completed,
    completionRatePercent: completion.ratePercent,
    statusBreakdown: statusBreakdown(books),
    monthlyFinishes: monthlyFinishCounts(
      readThisYearIds,
      books,
      planned.monthByBookId,
    ),
  };
}
