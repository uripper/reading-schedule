import type { Book } from "./types_books.js";
import type { PlannerScheduleRow } from "./types_planner.js";

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

export interface ManualSessionBook {
  bookId: string;
  title: string;
}

export type DayMode = "past" | "today" | "future";

export interface CompletionPayload {
  completed: boolean;
  row: CalendarRowWithFinish;
  sessionKey: string;
}

export interface ProgressPayload {
  bookId: string;
  pagesRead?: number | null;
  progressPercent?: number | null;
  row: CalendarRowWithFinish;
}

export interface MinutesPayload {
  minutes: number;
  row: CalendarRowWithFinish;
}

export interface ManualSessionAddPayload {
  date: string;
  bookId: string;
  minutes: number;
  completed?: boolean;
}

export interface DetailInteractionHandlers {
  isSessionCompleted(sessionKey: string): boolean;
  onSessionCompletionChanged(payload: CompletionPayload): void;
  onSessionProgressUpdated(payload: ProgressPayload): Book | null;
  onSessionMinutesUpdated(payload: MinutesPayload): boolean;
  getBookById(bookId: string): Book | null;
  listSessionBooks(): ManualSessionBook[];
  onManualSessionAdded(payload: ManualSessionAddPayload): boolean;
  onSessionRemoved(payload: { row: CalendarRowWithFinish }): boolean;
}

export interface CalendarStateSubset {
  rows: CalendarRowWithFinish[];
  totalsByBookId: Record<string, number>;
}

export interface BuildManualSessionAddPanelArgs {
  dateKey: string;
  mode: DayMode;
  interactionHandlers: DetailInteractionHandlers;
  rerenderDetails(): void;
  defaultBookId?: string;
  defaultMinutes?: number;
}

export interface SubmitManualAddFormArgs {
  dateKey: string;
  mode: DayMode;
  interactionHandlers: DetailInteractionHandlers;
  rerenderDetails(): void;
  bookSelect: HTMLSelectElement;
  minutesInput: HTMLInputElement;
  completeInput: HTMLInputElement;
}

export interface BookSelectionControls {
  titleFilterLabel: HTMLLabelElement;
  bookLabel: HTMLLabelElement;
  bookSelect: HTMLSelectElement;
}

export type MinutesEditorAction = "edit" | "cancel" | "saved";

export interface SubmitMinutesUpdateArgs {
  event: SubmitEvent;
  row: CalendarRowWithFinish;
  minutesInput: HTMLInputElement;
  initialMinutesValue: string;
  interactionHandlers: DetailInteractionHandlers;
}

export interface SubmitProgressUpdateArgs {
  event: SubmitEvent;
  row: CalendarRowWithFinish;
  pagesInput: HTMLInputElement;
  pctInput: HTMLInputElement;
  initialPagesValue: string;
  initialPercentValue: string;
  interactionHandlers: DetailInteractionHandlers;
}

export type CalendarDetailsState = CalendarStateSubset & {
  selectedDate: string;
  dates: Record<string, CalendarRowWithFinish[]>;
  expectedFinishHighlightDate: string;
};

export interface RowNodeForModeArgs {
  mode: DayMode;
  row: CalendarRowWithFinish;
  state: CalendarDetailsState;
  interactionHandlers: DetailInteractionHandlers;
  rerenderDetails(): void;
}

export type CompletionChangePayload = CompletionPayload;

export interface ProgressUpdatePayload {
  bookId: string;
  pagesRead?: number | null;
  progressPercent?: number | null;
}

export type MinutesUpdatePayload = MinutesPayload;

export type ManualSessionPayload = ManualSessionAddPayload;

export interface RemoveSessionPayload {
  row: CalendarRowWithFinish;
}

export interface CalendarHandlers {
  isSessionCompleted(this: void, sessionKey: string): boolean;
  onSessionCompletionChanged(this: void, payload: CompletionChangePayload): void;
  onSessionProgressUpdated(this: void, payload: ProgressUpdatePayload): Book | null;
  onSessionMinutesUpdated(this: void, payload: MinutesUpdatePayload): boolean;
  getBookById(this: void, bookId: string): Book | null;
  listSessionBooks(this: void): ManualSessionBook[];
  onManualSessionAdded(this: void, payload: ManualSessionPayload): boolean;
  onSessionRemoved(this: void, payload: RemoveSessionPayload): boolean;
}

export interface CalendarRuntimeState {
  dates: Record<string, CalendarRowWithFinish[]>;
  rawRows: PlannerScheduleRow[];
  rows: CalendarRowWithFinish[];
  totalsByBookId: Record<string, number>;
  months: string[];
  index: number;
  selectedDate: string;
  monthCellKeys: string[];
  expectedFinishHighlightDate: string;
}
