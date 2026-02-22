import type { Book } from "../books/types.js";
import type { Session } from "../sessions/normalize.js";
import type { FeatureFlags, Preferences } from "./experience/index.js";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export type PlannerSettings = {
  start_date?: string;
  end_date?: string;
  plan_mode?: string;
  minutes_per_day?: number | null;
  wpm_base?: number;
  time_quantum_minutes?: number;
  max_sessions_per_day?: number;
  max_books_per_day?: number;
  max_blocks_per_book_per_day?: number;
  w_finish?: number;
  w_priority?: number;
  w_switch?: number;
  w_smooth?: number;
  minutes_by_weekday?: Record<string, number>;
  days_off?: string[];
  difficulty_multiplier?: Record<string, number>;
} & Record<string, JsonValue>;

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

export interface BookLookupItem {
  title?: string;
  author?: string;
  year?: string | number;
  source?: string;
  cover_url?: string;
  words_estimate?: number;
  pages_estimate?: number;
}

export interface PlannerStateSnapshot {
  settings: PlannerSettings;
  books: Book[];
  preferences: Preferences;
  feature_flags: FeatureFlags;
  schedule_completions: Record<string, boolean>;
  sessions: Session[];
  last_result: PlannerResult | null;
}

export interface LoadedPlannerState {
  settings?: PlannerSettings;
  books?: Book[];
  preferences?: Partial<Preferences>;
  feature_flags?: Partial<FeatureFlags>;
  schedule_completions?: Record<string, boolean>;
  sessions?: Session[];
  last_result?: PlannerResult | null;
}

export interface PlanGeneratePayload {
  planner: "mip";
  books: Book[];
  settings: PlannerSettings;
}

export interface PlannerSaveResult {
  ok?: boolean;
  error?: string;
}
