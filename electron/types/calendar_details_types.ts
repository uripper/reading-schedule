import type { Book } from "./types_books.js";
import type { CalendarRowWithFinish } from "./types_calendar.js";

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
