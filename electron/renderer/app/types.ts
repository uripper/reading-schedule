import type { Book } from '../books/types.js';
import type { Session } from '../sessions/normalize.js';
import type { FeatureFlags, Preferences } from './experience.js';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

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

export type PlannerScheduleRow = {
  date: string;
  session_index: number;
  book_id: string;
  title: string;
  minutes: number;
  words_planned: number;
  finish?: boolean;
};

export type PlannerSummaryBook = {
  words_total?: number;
  words_planned?: number;
  minutes_planned?: number;
  finished?: boolean;
};

export type PlannerSummary = {
  feasibility_warning?: string | null;
  status?: string;
  total_planned_minutes?: number;
  total_available_minutes?: number;
  per_book?: Record<string, PlannerSummaryBook>;
} & Record<string, JsonValue>;

export type PlannerResult = {
  schedule: PlannerScheduleRow[];
  summary: PlannerSummary | null;
  created_at: string;
};

export type BookLookupItem = {
  title?: string;
  author?: string;
  year?: string | number;
  source?: string;
  cover_url?: string;
  words_estimate?: number;
  pages_estimate?: number;
};

export type PlannerStateSnapshot = {
  settings: PlannerSettings;
  books: Book[];
  preferences: Preferences;
  feature_flags: FeatureFlags;
  schedule_completions: Record<string, boolean>;
  sessions: Session[];
  last_result: PlannerResult | null;
};

export type LoadedPlannerState = {
  settings?: PlannerSettings;
  books?: Book[];
  preferences?: Partial<Preferences>;
  feature_flags?: Partial<FeatureFlags>;
  schedule_completions?: Record<string, boolean>;
  sessions?: Session[];
  last_result?: PlannerResult | null;
};

export type PlanGeneratePayload = {
  planner: 'mip';
  books: Book[];
  settings: PlannerSettings;
};

export type PlannerSaveResult = {
  ok?: boolean;
  error?: string;
};

export type WindowFindRequest = {
  query?: string;
  forward?: boolean;
  findNext?: boolean;
};

export type WindowFindResponse = {
  matches: number;
  activeMatchOrdinal: number;
};

export type PlannerApi = {
  loadState: () => Promise<LoadedPlannerState | null | undefined>;
  sample: () => Promise<Pick<PlannerStateSnapshot, 'settings' | 'books'>>;
  saveState: (state: PlannerStateSnapshot) => Promise<PlannerSaveResult>;
  generate: (payload: PlanGeneratePayload) => Promise<Pick<PlannerResult, 'schedule' | 'summary'>>;
  searchBooks: (query: string) => Promise<BookLookupItem[]>;
  downloadCover: (url: string | undefined, bookId: string | undefined) => Promise<string>;
  saveUploadedCover: (dataUrl: string | undefined, bookId: string | undefined) => Promise<string>;
  findInPage: (payload: WindowFindRequest) => Promise<WindowFindResponse>;
  stopFindInPage: () => Promise<WindowFindResponse>;
  zoomIn: () => Promise<number>;
  zoomOut: () => Promise<number>;
  zoomReset: () => Promise<number>;
};
