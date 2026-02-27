import type { FeatureFlags, Preferences } from "./app_experience.js";
import type { Book } from "./books_types.js";
import type { BookLookupItem } from "./book_lookup_search.js";
import type { JsonValue, Session } from "./core_sessions.js";
import type { PlannerResult } from "./planner_result.js";

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
  books_show_word_count?: boolean;
  books_show_blocker_meta?: boolean;
  books_show_shelf_meta?: boolean;
} & Record<string, JsonValue>;

export interface PlannerStateSnapshot {
  settings: PlannerSettings;
  books: Book[];
  preferences: Preferences;
  feature_flags: FeatureFlags;
  schedule_completions: Record<string, boolean>;
  blocked_day_books: Record<string, boolean>;
  sessions: Session[];
  last_result: PlannerResult | null;
}

export interface LoadedPlannerState {
  settings?: PlannerSettings;
  books?: Book[];
  preferences?: Partial<Preferences>;
  feature_flags?: Partial<FeatureFlags>;
  schedule_completions?: Record<string, boolean>;
  blocked_day_books?: Record<string, boolean>;
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

export interface PlannerApi {
  loadState(): Promise<LoadedPlannerState | null | undefined>;
  sample(): Promise<Pick<PlannerStateSnapshot, "settings" | "books">>;
  saveState(state: PlannerStateSnapshot): Promise<PlannerSaveResult>;
  generate(
    payload: PlanGeneratePayload,
  ): Promise<Pick<PlannerResult, "schedule" | "summary">>;
  searchBooks(query: string): Promise<BookLookupItem[]>;
  downloadCover(
    url: string | undefined,
    bookId: string | undefined,
  ): Promise<string>;
  saveUploadedCover(
    dataUrl: string | undefined,
    bookId: string | undefined,
  ): Promise<string>;
  zoomIn(): Promise<number>;
  zoomOut(): Promise<number>;
  zoomReset(): Promise<number>;
}
