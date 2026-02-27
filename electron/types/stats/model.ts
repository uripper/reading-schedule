import type { Book } from "../../renderer/books/types.js";
import type { Session } from "../../renderer/sessions/normalize.js";
import type { StatusBreakdown } from "../../renderer/stats/helpers.js";
import type { PlannerResult } from "../types.js";

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
