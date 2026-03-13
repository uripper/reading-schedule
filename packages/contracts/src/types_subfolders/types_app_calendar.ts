/**
 * Calendar interaction and schedule mutation contract types for the app runtime.
 */

import type { AppStateMutation } from "./types_app_runtime.js";
import type {
    BlockedDayBookState,
    PlannerCalendarBindings,
    PlannerResultState,
    ScheduleCompletionState,
    SetStatus,
} from "./types_app_shared.js";
import type { Book, BookProgressUpdates } from "./types_books.js";
import type { CalendarHandlers } from "./types_calendar.js";
import type { PlannerScheduleRow, PlannerSettings } from "./types_planner.js";

/** Minimal schedule-row shape used by completion and progress events. */
export interface ScheduleRow {
    /** Book id referenced by this lightweight schedule row payload. */
    book_id?: string;
    /** ISO date associated with the schedule row metadata. */
    date?: string;
    /** Book title associated with the row or summary item. */
    title?: string;
}

/** Payload emitted when a session completion flag is toggled. */
export interface CompletionUpdate {
    /** Completion state that should be applied to the target session. */
    completed: boolean;
    /** Optional row metadata associated with the completion update. */
    row?: ScheduleRow;
    /** Stable key identifying the session completion entry to update. */
    sessionKey: string;
}

/** Payload emitted when book progress is edited from the calendar. */
export interface ProgressUpdateInput {
    /** Book identifier associated with the row or progress change. */
    bookId: string;
    /** Optional pages-read value supplied during a progress update. */
    pagesRead?: number | null;
    /** Optional percent-complete value supplied during a progress update. */
    progressPercent?: number | null;
    /** Optional full schedule row associated with the progress edit. */
    row?: PlannerScheduleRow;
}

/** Book model returned after applying progress updates. */
export type UpdatedBook = Book;

/** Minimal runtime snapshot used by schedule row mutation helpers. */
export interface SharedUpdateState
    extends BlockedDayBookState,
        PlannerResultState,
        ScheduleCompletionState {}

/** Base dependencies for schedule row mutation operations. */
export interface SharedUpdateArgs extends PlannerCalendarBindings {
    /** Applies state mutation to runtime or UI state. */
    applyStateMutation(mutation: AppStateMutation): void;
    /** Notifies listeners after shared update helpers mutate rows. */
    onScheduleRowsUpdated(): void;
    /** Queues persist work for deferred execution. */
    queuePersist(): void;
    /** Status callback used to publish user-visible loading or error messages. */
    setStatus: SetStatus;
    /** Mutable runtime state consumed and updated by this module. */
    state: SharedUpdateState;
}

/** Dependencies used by calendar interaction handlers. */
export interface AppCalendarInteractionArgs extends SharedUpdateArgs {
    /** Collects all books from UI or runtime state. */
    collectAllBooks(): Book[];
    /** Collects settings from UI or runtime state. */
    collectSettings(): PlannerSettings;
    /** Registers calendar handlers for schedule and progress interactions. */
    configureCalendarInteractions(handlers?: Partial<CalendarHandlers>): void;
    /** Returns book by id from current runtime state. */
    getBookById(bookId: string): Book | null;
    /** Optional callback fired after book progress has been updated. */
    onProgressUpdated?(book: UpdatedBook): void;
    /** Optional callback fired when a session completion toggle is applied. */
    onSessionCompletionUpdated?(payload: CompletionUpdate): void;
    /** Applies progress updates to a book and returns the updated book if found. */
    updateBookProgress(
        bookId: string,
        updates: BookProgressUpdates,
        options: { notifyBooksChanged?: boolean },
    ): UpdatedBook | null;
}

/** Calendar handler subset for manual session add, remove, and minute-edit actions. */
export type ScheduleMutationHandlers = Pick<
    CalendarHandlers,
    "onManualSessionAdded" | "onSessionMinutesUpdated" | "onSessionRemoved"
>;

/** Shared callbacks/state used by schedule mutation helpers. */
export interface SharedScheduleBindings {
    /** Shared state-mutation dispatcher used by schedule helpers. */
    applyStateMutation: AppCalendarInteractionArgs["applyStateMutation"];
    /** Shared settings collector used when recalculating schedule rows. */
    collectSettings: AppCalendarInteractionArgs["collectSettings"];
    /** Shared book lookup used by schedule mutation handlers. */
    getBookById: AppCalendarInteractionArgs["getBookById"];
    /** Notifies listeners that schedule rows have changed. */
    onScheduleRowsUpdated(this: void): void;
    /** Queues persist work for deferred execution. */
    queuePersist(this: void): void;
    /** Shared calendar renderer used after schedule mutations. */
    renderCalendar: AppCalendarInteractionArgs["renderCalendar"];
    /** Shared state writer for replacing schedule rows. */
    setBookScheduleRows: AppCalendarInteractionArgs["setBookScheduleRows"];
    /** Shared state writer for replacing the latest planner result. */
    setLastResult: AppCalendarInteractionArgs["setLastResult"];
    /** Status callback used to publish user-visible loading or error messages. */
    setStatus: AppCalendarInteractionArgs["setStatus"];
    /** Mutable runtime state consumed and updated by this module. */
    state: AppCalendarInteractionArgs["state"];
    /** Shared helper that builds day totals from planner summary data. */
    totalsFromSummary: AppCalendarInteractionArgs["totalsFromSummary"];
}

/** Arguments required to append a manual session to the current schedule. */
export interface AddManualSessionArgs extends SharedUpdateArgs {
    /** Book id for the newly added manual session. */
    bookId: string;
    /** Collects settings from UI or runtime state. */
    collectSettings(this: void): PlannerSettings;
    /** Optional completion flag applied to the new session. */
    completed?: boolean;
    /** ISO date for the newly added manual session. */
    date: string;
    /** Returns book by id from current runtime state. */
    getBookById(this: void, bookId: string): Book | null;
    /** Session duration in minutes. */
    minutes: number;
}

/** Arguments required to remove a scheduled session row. */
export interface RemoveSessionArgs extends SharedUpdateArgs {
    /** Schedule row being removed. */
    row: PlannerScheduleRow;
}

/** Arguments required to update the minutes on an existing scheduled session. */
export interface UpdateSessionMinutesArgs extends SharedUpdateArgs {
    /** Collects settings from UI or runtime state. */
    collectSettings(this: void): PlannerSettings;
    /** Returns book by id from current runtime state. */
    getBookById(this: void, bookId: string): Book | null;
    /** New session duration in minutes. */
    minutes: number;
    /** Schedule row being updated. */
    row: PlannerScheduleRow;
}

/** Minimal row metadata used while normalizing completion state. */
export type CompletionRow = ScheduleRow;

/** Result from schedule-row mutation helpers; null means no update was produced. */
export type UpdatedRowsResult = {
    normalizedMinutes: number;
    rows: PlannerScheduleRow[];
} | null;
