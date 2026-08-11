/**
 * Shared app contract fragments reused across runtime, dashboard, planning,
 * and calendar type modules.
 */

import type { Book } from "./types_books.ts";
import type { Session } from "./types_core.ts";
import type {
    PlannerApi,
    PlannerResult,
    PlannerScheduleRow,
    PlannerSettings,
    PlannerSummary,
} from "./types_planner.ts";

/** Visual status phases used by transient planner status overlays. */
export type StatusPhase = "loading" | "success" | "error";

/** Callback used to publish status text to the UI; set isError for failure state styling. */
export type SetStatus = (
    message: string,
    isError?: boolean,
    phase?: StatusPhase,
) => void;

/** ARIA live-region politeness used when announcing messages to assistive technologies. */
export type AnnouncePoliteness = "polite" | "assertive";

/** Function signature for accessibility announcement callbacks. */
export type Announcer = (
    message: string,
    politeness?: AnnouncePoliteness,
) => void;

/** Function signature for app log sink callbacks. */
export type AddLog = (message: string) => void;

/** Optional document-level preferences collected from the UI before normalization. */
export interface DocumentPreferencesInput {
    /** Optional reduced-motion preference captured from UI controls before normalization. */
    reduceMotion?: boolean;
}

/** Options that control which element receives focus when a dialog opens. */
export interface DialogFocusOptions {
    /** Optional selector for the element that should receive initial dialog focus. */
    initialFocusSelector?: string | null;
}

/** Supported severity levels for structured app logging. */
export type LogLevel = "debug" | "info" | "error";

/** Structured logging payload used by renderer and main process logging helpers. */
export interface LogPayload {
    /** Additional metadata that gives structured context for the log event. */
    context?: Record<string, unknown>;
    /** Captured error value associated with the log entry, if any. */
    error?: unknown;
    /** Severity level that controls downstream log handling. */
    level: LogLevel;
    /** Human-readable log message. */
    message: string;
}

/** Behavior flags used when switching between top-level application tabs. */
export interface ActivateTabOptions {
    /** When true, keyboard focus is moved to the activated tab panel after tab switch. */
    focusPanel?: boolean;
}

/** Subset of PlannerApi exposing only zoom controls for keyboard shortcuts. */
export type ZoomApi = Pick<PlannerApi, "zoomIn" | "zoomOut" | "zoomReset">;

/** Dependencies required by keyboard shortcut handlers. */
export interface ShortcutBindings {
    /** Announces shortcut outcomes through the accessibility live region. */
    announce: Announcer;
    /** Zoom-capable planner API used by shortcut handlers. */
    plannerApi: ZoomApi;
}

/** Completion flags keyed by session or schedule identifiers. */
export type ScheduleCompletions = Record<string, boolean>;

/** Map of day-book keys that are locked from automatic rescheduling. */
export type BlockedDayBooks = Record<string, boolean>;

/** Calendar day totals keyed by ISO date string. */
export type CalendarDayTotals = Record<string, number>;

/** Current book collection used for planning, rendering, or stats. */
export interface BookCollectionState {
    /** Current book collection used for planning, rendering, or stats. */
    books: Book[];
}

/** Current reading session records from runtime state. */
export interface SessionState {
    /** Current reading session records from runtime state. */
    sessions: Session[];
}

/** Most recent planner output tracked by runtime state. */
export interface PlannerResultState {
    /** Most recent planner output; null means no plan is currently loaded. */
    lastResult: PlannerResult | null;
}

/** Completion flags tracked by runtime state. */
export interface ScheduleCompletionState {
    /** Completion flags keyed by session or schedule identifiers. */
    scheduleCompletions: ScheduleCompletions;
}

/** Locked day-book pairs tracked by runtime state. */
export interface BlockedDayBookState {
    /** Map of day-book keys that are locked from automatic rescheduling. */
    blockedDayBooks: BlockedDayBooks;
}

/** Daily reading goal tracked in minutes. */
export interface DailyGoalState {
    /** Daily reading goal in minutes used for stats calculations. */
    dailyGoalMinutes: number;
}

/** Shared dashboard stats payload built from the current runtime state. */
export interface DashboardStatsPayload
    extends BookCollectionState,
        DailyGoalState,
        PlannerResultState,
        ScheduleCompletionState,
        SessionState {}

/** Inputs used to recalculate dashboard stats from the current runtime state. */
export type UpdateStatsArgs = DashboardStatsPayload;

/** globalThis shape used when preload injects plannerApi onto the renderer global. */
export type PlannerApiGlobal = typeof globalThis & { plannerApi?: PlannerApi };

/** Map of day keys to minute totals used by calendar summaries. */
export type DayMinutesMap = Map<string, number>;

/** Inputs used to compute minute totals for a specific year. */
export interface DayMinutesArgs
    extends PlannerResultState,
        ScheduleCompletionState,
        SessionState {
    /** Target calendar year used when grouping minute totals. */
    year: number | null;
}

/** Shared collectors used to read planning inputs from UI or runtime state. */
export interface PlannerInputCollectors {
    /** Collects books from UI or runtime state. */
    collectBooks(this: void): Book[];
    /** Collects settings from UI or runtime state. */
    collectSettings(this: void): PlannerSettings;
}

/** Shared reader used to pull sessions from runtime state. */
export interface SessionReader {
    /** Returns sessions from current runtime state. */
    getSessions(this: void): Session[];
}

/** Shared readers used to pull planner state from runtime state. */
export interface PlannerStateReaders {
    /** Returns last result from current runtime state. */
    getLastResult(this: void): PlannerResult | null;
    /** Returns schedule completions from current runtime state. */
    getScheduleCompletions(this: void): ScheduleCompletions;
}

/** Shared reader used to pull blocked day-book state from runtime state. */
export interface BlockedDayBookReader {
    /** Returns blocked day books from current runtime state. */
    getBlockedDayBooks(this: void): BlockedDayBooks;
}

/** Shared planner/calendar bindings used when applying schedule changes. */
export interface PlannerCalendarBindings {
    /** Renders schedule rows and day totals into the calendar UI. */
    renderCalendar(
        this: void,
        rows: PlannerScheduleRow[],
        totals: CalendarDayTotals,
    ): void;
    /** Updates book schedule rows in runtime state. */
    setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
    /** Updates last result in runtime state. */
    setLastResult(this: void, result: PlannerResult): void;
    /** Converts a planner summary into per-day minute totals for calendar rendering. */
    totalsFromSummary(
        this: void,
        summary: PlannerSummary | null,
    ): CalendarDayTotals;
}

/** Shared writer used to update completion flags in runtime state. */
export interface ScheduleCompletionWriter {
    /** Updates schedule completions in runtime state. */
    setScheduleCompletions(this: void, completions: ScheduleCompletions): void;
}
