import type { PlannerScheduleRow } from "../../types.js";

export interface TodayBookSummary {
  bookId: string;
  title: string;
  coverSrc: string;
  plannedMinutes: number;
  scheduledSessions: number;
  completedSessions: number;
}

export interface TodayScheduleSnapshot {
  nextUncompletedRow: PlannerScheduleRow | null;
  completedPlannedMinutes: number;
  scheduledSessions: number;
  completedSessions: number;
  books: TodayBookSummary[];
}
