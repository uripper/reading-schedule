import type { Book } from '../books/types.js';

type SettingsRecord = Record<string, unknown>;

type PlanResult = {
  schedule?: unknown[];
  summary?: unknown;
  created_at?: string;
};

export type LoadedPlannerState = {
  settings?: SettingsRecord;
  books?: Book[];
  preferences?: unknown;
  feature_flags?: unknown;
  schedule_completions?: Record<string, unknown>;
  sessions?: unknown[];
  last_result?: PlanResult | null;
};

export type PlannerApi = {
  loadState: () => Promise<LoadedPlannerState | null | undefined>;
  sample: () => Promise<Pick<LoadedPlannerState, 'settings' | 'books'>>;
  saveState: (state: unknown) => Promise<unknown>;
  generate: (payload: unknown) => Promise<unknown>;
  searchBooks: (query: string) => Promise<unknown>;
  downloadCover: (url: string | undefined, bookId: string | undefined) => Promise<string>;
};
