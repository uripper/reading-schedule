import type { CompletionUpdate, ManualSessionAddInput, ManualSessionBook, MinutesUpdateInput, ProgressUpdateInput, RemoveSessionInput, UpdatedBook } from "../../../renderer/app/calendar_interactions/calendar_interactions_helpers.js";
import type { Book } from "../../../renderer/books/types.js";
import type { PlannerResult, PlannerScheduleRow, PlannerSettings, PlannerSummary } from "../../types.js";

export interface AppCalendarInteractionArgs {
  configureCalendarInteractions(handlers: {
    isSessionCompleted(sessionKey: string): boolean;
    onSessionCompletionChanged(payload: CompletionUpdate): void;
    onSessionProgressUpdated(payload: ProgressUpdateInput): UpdatedBook | null;
    getBookById(bookId: string): Book | null;
    listSessionBooks(): ManualSessionBook[];
    onManualSessionAdded(payload: ManualSessionAddInput): boolean;
    onSessionMinutesUpdated(payload: MinutesUpdateInput): boolean;
    onSessionRemoved(payload: RemoveSessionInput): boolean;
  }): void;
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
  renderCalendar(
    rows: PlannerScheduleRow[],
    totals: Record<string, number>,
  ): void;
  totalsFromSummary(summary: PlannerSummary | null): Record<string, number>;
  updateBookProgress(
    bookId: string,
    updates: { pagesRead?: number | null; progressPercent?: number | null },
    options: { notifyBooksChanged?: boolean },
  ): UpdatedBook | null;
  getBookById(bookId: string): Book | null;
  setLastResult(result: PlannerResult): void;
  onSessionCompletionUpdated?(payload: CompletionUpdate): void;
  onProgressUpdated?(book: UpdatedBook): void;
  onScheduleRowsUpdated?(): void;
}
