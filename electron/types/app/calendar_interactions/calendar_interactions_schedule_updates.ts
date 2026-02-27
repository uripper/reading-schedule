import type { Book } from "../../../renderer/books/types.js";
import type { PlannerResult, PlannerScheduleRow, PlannerSettings, PlannerSummary } from "../../types.js";

export interface SharedUpdateArgs {
  onScheduleRowsUpdated(): void;
  queuePersist(): void;
  renderCalendar(
    rows: PlannerScheduleRow[],
    totals: Record<string, number>,
  ): void;
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
