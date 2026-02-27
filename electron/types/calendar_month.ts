import type { Book } from "./books_types.js";
import type { PlannerScheduleRow } from "./planner_result.js";

export interface CalendarDisplayRow {
  book_id?: string;
  date?: string;
  session_index?: string | number;
  title?: string;
  minutes?: number;
  words_planned?: number;
  finish?: boolean;
}

export interface CalendarState {
  dates: Record<string, CalendarDisplayRow[]>;
  months: string[];
  index: number;
  selectedDate: string;
  monthCellKeys: string[];
}

export interface MonthActions {
  completedBookRowsForDate(this: void, dateKey: string): CalendarDisplayRow[];
  moveSelectionBy(this: void, delta: number, currentIndex: number): void;
  renderDetails(this: void): void;
  selectDate(this: void, dateKey: string, options?: { focus?: boolean }): void;
}

export type CompletionChecker = (sessionKey: string) => boolean;

export type CalendarRow = PlannerScheduleRow;

export type CalendarRowWithFinish = CalendarRow & {
  finish: boolean;
};

export type RowsByDate = Record<string, CalendarRowWithFinish[]>;

export interface CalendarControlsState {
  months: string[];
  index: number;
}

export type RenderFn = () => void;

export type JumpToTodayFn = () => void;

export interface SortableRow {
  date: string;
  session_index: string | number;
}

export interface CompletedBookRow {
  book_id: string;
  date: string;
  finish: boolean;
  minutes: number;
  title: string;
}

export interface BookFinishLookup {
  finished_at: string | null;
  title: string;
}

export interface EstimateRow {
  book_id: string;
  date: string;
  session_index: string | number;
  words_planned?: number;
}

export interface EstimateState {
  rows?: EstimateRow[];
  totalsByBookId?: Record<string, number>;
}

export type BookGetter = (bookId: string) => Book | null;

export interface EstimateSnapshot {
  changedInSession: boolean;
  endPages: number | null;
  endPercent: number;
  startPages: number | null;
  startPercent: number;
}

export interface DayStyleFlags {
  hasFinishRow: boolean;
  isMuted: boolean;
  isPast: boolean;
  isSelected: boolean;
  isToday: boolean;
}

export interface DayStyleFlagsArgs {
  date: Date;
  firstDate: Date;
  keyForDay: string;
  selectedDate: string;
  todayKey: string;
  rows: CalendarDisplayRow[];
}

export type {
  BookSelectionControls,
  BuildManualSessionAddPanelArgs,
  CalendarDetailsState,
  CalendarStateSubset,
  CompletionPayload,
  DayMode,
  DetailInteractionHandlers,
  ManualSessionAddPayload,
  ManualSessionBook,
  MinutesEditorAction,
  RowNodeForModeArgs,
  SubmitManualAddFormArgs,
  SubmitMinutesUpdateArgs,
  SubmitProgressUpdateArgs,
} from "./calendar_details_types.js";

export type {
  CalendarHandlers,
  CalendarRuntimeState,
  CompletionChangePayload,
  ManualSessionPayload,
  MinutesUpdatePayload,
  ProgressUpdatePayload,
  RemoveSessionPayload,
} from "./calendar_state_runtime.js";
