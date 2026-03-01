export type * from "./types_app.js";
export type * from "./types_books.js";
export type * from "./types_calendar.js";
export type * from "./types_core.js";
export type * from "./types_experience.js";
export type * from "./types_lookup.js";
export type * from "./types_main.js";
export type * from "./types_planner.js";

import { type Book, type BookStatus } from "./types_books.js";
import { type Session } from "./types_core.js";
import { type PlannerResult } from "./types_planner.js";

export type StatusBreakdown = Record<BookStatus, number>;

export interface StatsSnapshot {
    activeDaysYear: number;
    averageProgressPercent: number;
    booksStartedCount: number;
    completedSessionsToDate: number;
    completionRatePercent: number;
    currentStreakDays: number;
    finishedThisYearCount: number;
    monthlyFinishes: number[];
    plannedFinishCount: number;
    projectedFinishCount: number;
    readingMinutesYear: number;
    scheduledSessionsToDate: number;
    statusBreakdown: StatusBreakdown;
    totalBooks: number;
    year: number;
}

export interface SnapshotInputs {
    books: Book[];
    dailyGoalMinutes?: number;
    lastResult: PlannerResult | null;
    scheduleCompletions: Record<string, boolean>;
    sessions: Session[];
}
