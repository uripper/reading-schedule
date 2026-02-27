import type { Book, BookStatus } from "./books_types.js";
import type { Session } from "./core_sessions.js";
import type { PlannerResult } from "./planner_result.js";

export type StatusBreakdown = Record<BookStatus, number>;

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

export interface SnapshotInputs {
  books: Book[];
  sessions: Session[];
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  dailyGoalMinutes?: number;
}
