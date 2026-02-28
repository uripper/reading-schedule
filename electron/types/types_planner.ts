import type { FeatureFlags, Preferences } from "./types_experience.js";
import type { Book } from "./types_books.js";
import type { BookLookupItem } from "./types_lookup.js";
import type { JsonValue, Session } from "./types_core.js";

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

export type PlannerStateLoadSource =
  | "sqlite"
  | "sqlite_journal_replay"
  | "json_primary"
  | "json_backup"
  | "fresh";

export type PlannerStateLoadWarningCode =
  | "RECOVERED_FROM_BACKUP"
  | "RECOVERED_FROM_JOURNAL"
  | "STATE_RESET_FRESH"
  | "MIGRATED_JSON_TO_SQLITE";

export interface PlannerStateLoadResult {
  state: LoadedPlannerState | null;
  source: PlannerStateLoadSource;
  sourcePath?: string;
  warningCode?: PlannerStateLoadWarningCode;
  warningMessage?: string;
}

export interface PlannerSaveResult {
  ok?: boolean;
  error?: string;
  warningCode?: PlannerStateLoadWarningCode;
  warningMessage?: string;
}

export interface PlannerApi {
  loadState(): Promise<PlannerStateLoadResult>;
  sample(): Promise<Pick<PlannerStateSnapshot, "settings" | "books">>;
  saveState(state: PlannerStateSnapshot): Promise<PlannerSaveResult>;
  generate(
    payload: PlanGeneratePayload,
  ): Promise<Pick<PlannerResult, "schedule" | "summary">>;
  searchBooks(query: string, author?: boolean): Promise<BookLookupItem[]>;
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
