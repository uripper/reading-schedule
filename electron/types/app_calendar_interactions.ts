import type { Book, BookProgressUpdates } from "./books_types.js";
import type { ManualSessionBook } from "./calendar_details_types.js";
import type { CalendarHandlers } from "./calendar_state_runtime.js";
import type { PlannerResult, PlannerScheduleRow, PlannerSummary } from "./planner_result.js";
import type { PlannerSettings } from "./planner_settings.js";

export interface ScheduleRow {
  title?: string;
  date?: string;
  book_id?: string;
}

export interface CompletionUpdate {
  sessionKey: string;
  completed: boolean;
  row?: ScheduleRow;
}

export interface ProgressUpdateInput {
  bookId: string;
  pagesRead?: number | null;
  progressPercent?: number | null;
  row?: PlannerScheduleRow;
}

export interface ManualSessionAddInput {
  date: string;
  bookId: string;
  minutes: number;
  completed?: boolean;
}

export interface RemoveSessionInput {
  row: PlannerScheduleRow;
}

export interface MinutesUpdateInput {
  minutes: number;
  row: PlannerScheduleRow;
}

export type UpdatedBook = Book;

export interface AppCalendarInteractionArgs {
  configureCalendarInteractions(handlers?: Partial<CalendarHandlers>): void;
  state: {
    scheduleCompletions: Record<string, boolean>;
    blockedDayBooks: Record<string, boolean>;
    lastResult: PlannerResult | null;
  };
  queuePersist(): void;
  setStatus(message: string, isError?: boolean): void;
  collectSettings(): PlannerSettings;
  collectAllBooks(): Book[];
  setBookScheduleRows(rows: PlannerScheduleRow[]): void;
  renderCalendar(rows: PlannerScheduleRow[], totals: Record<string, number>): void;
  totalsFromSummary(summary: PlannerSummary | null): Record<string, number>;
  updateBookProgress(
    bookId: string,
    updates: BookProgressUpdates,
    options: { notifyBooksChanged?: boolean },
  ): UpdatedBook | null;
  getBookById(bookId: string): Book | null;
  setLastResult(result: PlannerResult): void;
  onSessionCompletionUpdated?(payload: CompletionUpdate): void;
  onProgressUpdated?(book: UpdatedBook): void;
  onScheduleRowsUpdated?(): void;
}

export type CalendarInteractionHandlers = Partial<CalendarHandlers>;

export type ScheduleMutationHandlers = Pick<
  CalendarHandlers,
  "onManualSessionAdded" | "onSessionMinutesUpdated" | "onSessionRemoved"
>;

export interface SharedScheduleBindings {
  collectSettings: AppCalendarInteractionArgs["collectSettings"];
  getBookById: AppCalendarInteractionArgs["getBookById"];
  onScheduleRowsUpdated(this: void): void;
  queuePersist(this: void): void;
  renderCalendar: AppCalendarInteractionArgs["renderCalendar"];
  setBookScheduleRows: AppCalendarInteractionArgs["setBookScheduleRows"];
  setLastResult: AppCalendarInteractionArgs["setLastResult"];
  setStatus: AppCalendarInteractionArgs["setStatus"];
  state: AppCalendarInteractionArgs["state"];
  totalsFromSummary: AppCalendarInteractionArgs["totalsFromSummary"];
}

export interface SharedUpdateArgs {
  onScheduleRowsUpdated(): void;
  queuePersist(): void;
  renderCalendar(rows: PlannerScheduleRow[], totals: Record<string, number>): void;
  setBookScheduleRows(rows: PlannerScheduleRow[]): void;
  setLastResult(result: PlannerResult): void;
  setStatus(message: string, isError?: boolean): void;
  state: {
    lastResult: PlannerResult | null;
    scheduleCompletions: Record<string, boolean>;
    blockedDayBooks: Record<string, boolean>;
  };
  totalsFromSummary(summary: PlannerSummary | null): Record<string, number>;
}

export type AddManualSessionArgs = SharedUpdateArgs & {
  bookId: string;
  collectSettings(this: void): PlannerSettings;
  completed?: boolean;
  date: string;
  getBookById(this: void, bookId: string): Book | null;
  minutes: number;
};

export type RemoveSessionArgs = SharedUpdateArgs & {
  row: PlannerScheduleRow;
};

export type UpdateSessionMinutesArgs = SharedUpdateArgs & {
  collectSettings(this: void): PlannerSettings;
  getBookById(this: void, bookId: string): Book | null;
  minutes: number;
  row: PlannerScheduleRow;
};

export interface CompletionRow {
  date?: string;
  book_id?: string;
  title?: string;
}

export type UpdatedRowsResult = {
  normalizedMinutes: number;
  rows: PlannerScheduleRow[];
} | null;

export type { ManualSessionBook };
