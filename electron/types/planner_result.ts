import type { JsonValue } from "./types_core.js";

export interface PlannerScheduleRow {
  date: string;
  session_index: number;
  book_id: string;
  title: string;
  minutes: number;
  words_planned: number;
  finish?: boolean;
}

export interface PlannerSummaryBook {
  words_total?: number;
  words_planned?: number;
  minutes_planned?: number;
  finished?: boolean;
}

export type PlannerSummary = {
  feasibility_warning?: string | null;
  status?: string;
  total_planned_minutes?: number;
  total_available_minutes?: number;
  per_book?: Record<string, PlannerSummaryBook>;
} & Record<string, JsonValue>;

export interface PlannerResult {
  schedule: PlannerScheduleRow[];
  summary: PlannerSummary | null;
  created_at: string;
}
