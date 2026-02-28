import type { Book, BookStatus } from "./types_books.js";
import type { Session } from "./types_core.js";
import type { PlannerResult } from "./types_planner.js";

export type StatusBreakdown = Record<BookStatus, number>;

export interface StatsTrendPoint {
	label: string;
	value: number;
}

export interface StatsSeries {
	name: string;
	points: StatsTrendPoint[];
}

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

export interface BuildStatsSnapshotArgs extends SnapshotInputs {
	year: number;
}
