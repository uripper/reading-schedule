import { type Book } from "./types_books.js";
import { type PlannerScheduleRow } from "./types_planner.js";

export interface CalendarDisplayRow {
    book_id?: string;
    date?: string;
    finish?: boolean;
    minutes?: number;
    session_index?: string | number;
    title?: string;
    words_planned?: number;
}

export interface CalendarState {
    dates: Record<string, CalendarDisplayRow[]>;
    index: number;
    monthCellKeys: string[];
    months: string[];
    selectedDate: string;
}

export interface MonthActions {
    completedBookRowsForDate(this: void, dateKey: string): CalendarDisplayRow[];
    moveSelectionBy(this: void, delta: number, currentIndex: number): void;
    renderDetails(this: void): void;
    selectDate(
        this: void,
        dateKey: string,
        options?: { focus?: boolean },
    ): void;
}

export type CompletionChecker = (sessionKey: string) => boolean;

export type CalendarRow = PlannerScheduleRow;

export type CalendarRowWithFinish = CalendarRow & {
    finish: boolean;
};

export type RowsByDate = Record<string, CalendarRowWithFinish[]>;

export interface CalendarControlsState {
    index: number;
    months: string[];
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
    rows: CalendarDisplayRow[];
    selectedDate: string;
    todayKey: string;
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
    bookId: string;
    completed?: boolean;
    date: string;
    minutes: number;
}

export interface DetailInteractionHandlers {
    getBookById(bookId: string): Book | null;
    isSessionCompleted(sessionKey: string): boolean;
    listSessionBooks(): ManualSessionBook[];
    onManualSessionAdded(payload: ManualSessionAddPayload): boolean;
    onSessionCompletionChanged(payload: CompletionPayload): void;
    onSessionMinutesUpdated(payload: MinutesPayload): boolean;
    onSessionProgressUpdated(payload: ProgressPayload): Book | null;
    onSessionRemoved(payload: { row: CalendarRowWithFinish }): boolean;
}

export interface CalendarStateSubset {
    rows: CalendarRowWithFinish[];
    totalsByBookId: Record<string, number>;
}

export interface BuildManualSessionAddPanelArgs {
    dateKey: string;
    defaultBookId?: string;
    defaultMinutes?: number;
    interactionHandlers: DetailInteractionHandlers;
    mode: DayMode;
    rerenderDetails(): void;
}

export interface SubmitManualAddFormArgs {
    bookSelect: HTMLSelectElement;
    completeInput: HTMLInputElement;
    dateKey: string;
    interactionHandlers: DetailInteractionHandlers;
    minutesInput: HTMLInputElement;
    mode: DayMode;
    rerenderDetails(): void;
}

export interface BookSelectionControls {
    bookLabel: HTMLLabelElement;
    bookSelect: HTMLSelectElement;
    titleFilterLabel: HTMLLabelElement;
}

export type MinutesEditorAction = "edit" | "cancel" | "saved";

export interface SubmitMinutesUpdateArgs {
    event: SubmitEvent;
    initialMinutesValue: string;
    interactionHandlers: DetailInteractionHandlers;
    minutesInput: HTMLInputElement;
    row: CalendarRowWithFinish;
}

export interface SubmitProgressUpdateArgs {
    event: SubmitEvent;
    initialPagesValue: string;
    initialPercentValue: string;
    interactionHandlers: DetailInteractionHandlers;
    pagesInput: HTMLInputElement;
    pctInput: HTMLInputElement;
    row: CalendarRowWithFinish;
}

export type CalendarDetailsState = CalendarStateSubset & {
    selectedDate: string;
    dates: Record<string, CalendarRowWithFinish[]>;
    expectedFinishHighlightDate: string;
};

export interface RowNodeForModeArgs {
    interactionHandlers: DetailInteractionHandlers;
    mode: DayMode;
    rerenderDetails(): void;
    row: CalendarRowWithFinish;
    state: CalendarDetailsState;
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
    getBookById(this: void, bookId: string): Book | null;
    isSessionCompleted(this: void, sessionKey: string): boolean;
    listSessionBooks(this: void): ManualSessionBook[];
    onManualSessionAdded(this: void, payload: ManualSessionPayload): boolean;
    onSessionCompletionChanged(
        this: void,
        payload: CompletionChangePayload,
    ): void;
    onSessionMinutesUpdated(this: void, payload: MinutesUpdatePayload): boolean;
    onSessionProgressUpdated(
        this: void,
        payload: ProgressUpdatePayload,
    ): Book | null;
    onSessionRemoved(this: void, payload: RemoveSessionPayload): boolean;
}

export interface CalendarRuntimeState {
    dates: Record<string, CalendarRowWithFinish[]>;
    expectedFinishHighlightDate: string;
    index: number;
    monthCellKeys: string[];
    months: string[];
    rawRows: PlannerScheduleRow[];
    rows: CalendarRowWithFinish[];
    selectedDate: string;
    totalsByBookId: Record<string, number>;
}
