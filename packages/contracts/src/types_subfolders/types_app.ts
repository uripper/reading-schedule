import type { Book, BookProgressUpdates } from "./types_books.js";
import type { CalendarHandlers } from "./types_calendar.js";
import type { Session } from "./types_core.js";
import type { FeatureFlags, Preferences } from "./types_experience.js";
import type {
    LoadedPlannerState,
    PlannerApi,
    PlannerResult,
    PlannerScheduleRow,
    PlannerSettings,
    PlannerStateLoadResult,
    PlannerSummary,
} from "./types_planner.js";

/** Callback used to publish status text to the UI; set isError for failure state styling. */
export type SetStatus = (message: string, isError?: boolean) => void;

/** ARIA live-region politeness used when announcing messages to assistive technologies. */
export type AnnouncePoliteness = "polite" | "assertive";

/** Optional document-level preferences collected from the UI before normalization. */
export interface DocumentPreferencesInput {
    /** Optional reduced-motion preference captured from UI controls before normalization. */
    reduceMotion?: boolean;
    /** Optional theme key captured from UI controls before normalization. */
    theme?: string;
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
    announce(
        this: void,
        message: string,
        politeness?: AnnouncePoliteness,
    ): void;
    /** Zoom-capable planner API used by shortcut handlers. */
    plannerApi: ZoomApi;
}

/** Inputs used to recalculate dashboard stats from the current runtime state. */
export interface UpdateStatsArgs {
    /** Current book collection used for planning, rendering, or stats. */
    books: Book[];
    /** Daily reading goal in minutes used for stats calculations. */
    dailyGoalMinutes: number;
    /** Most recent planner output; null means no plan is currently loaded. */
    lastResult: PlannerResult | null;
    /** Completion flags keyed by session or schedule identifiers. */
    scheduleCompletions: Record<string, boolean>;
    /** Current reading session records from runtime state. */
    sessions: Session[];
}

/** globalThis shape used when preload injects plannerApi onto the renderer global. */
export type PlannerApiGlobal = typeof globalThis & { plannerApi?: PlannerApi };

/** Map of day keys to minute totals used by calendar summaries. */
export type DayMinutesMap = Map<string, number>;

/** Inputs used to compute minute totals for a specific year. */
export interface DayMinutesArgs {
    /** Most recent planner output; null means no plan is currently loaded. */
    lastResult: PlannerResult | null;
    /** Completion flags keyed by session or schedule identifiers. */
    scheduleCompletions: Record<string, boolean>;
    /** Current reading session records from runtime state. */
    sessions: Session[];
    /** Target calendar year used when grouping minute totals. */
    year: number | null;
}
/** State snapshot consumed by the persistence queue. */
export interface PersistQueueState {
    /** Map of day-book keys that are locked from automatic rescheduling. */
    blockedDayBooks: Record<string, boolean>;
    /** Normalized feature flags controlling optional runtime behavior. */
    featureFlags: FeatureFlags;
    /** Most recent planner output; null means no plan is currently loaded. */
    lastResult: PlannerResult | null;
    /** Normalized user experience preferences applied by the renderer. */
    preferences: Preferences;
    /** True once initial load finishes and runtime is ready for normal interactions. */
    ready: boolean;
    /** Completion flags keyed by session or schedule identifiers. */
    scheduleCompletions: Record<string, boolean>;
}

/** Canonical mutable renderer state shared across app runtime modules. */
export interface AppRuntimeState extends PersistQueueState {
    /** Derived lookup indexes computed from current runtime state. */
    derived: AppDerivedIndexes;
    /** Current reading session records from runtime state. */
    sessions: Session[];
}

/** Derived indexes built from runtime state for fast schedule and book lookups. */
export interface AppDerivedIndexes {
    /** Lookup table of books keyed by book id. */
    bookById: Map<string, Book>;
    /** Completion lookup keyed by combined day/book identifiers. */
    completionByDayBookKey: Record<string, boolean>;
    /** Completion lookup keyed by session identifier. */
    completionBySessionKey: Record<string, boolean>;
    /** Sessions grouped by book id for quick per-book queries. */
    sessionsByBook: Map<string, Session[]>;
    /** Sessions grouped by day for quick calendar queries. */
    sessionsByDay: Map<string, Session[]>;
}

/** Discriminated union of immutable runtime state mutations applied by calendar interactions. */
export type AppStateMutation =
    | {
          type: "set_last_result";
          lastResult: PlannerResult | null;
      }
    | {
          type: "set_schedule_completions";
          scheduleCompletions: Record<string, boolean>;
      }
    | {
          type: "set_blocked_day_books";
          blockedDayBooks: Record<string, boolean>;
      }
    | {
          type: "set_blocked_day_book";
          key: string;
          blocked: boolean;
      }
    | {
          type: "set_sessions";
          sessions: Session[];
      }
    | {
          type: "set_book_index";
          books: Book[];
      };

/** Dependencies used to build a draft payload before saving state. */
export interface DraftDataParams {
    /** Map of day-book keys that are locked from automatic rescheduling. */
    blockedDayBooks: Record<string, boolean>;
    /** Collects books from UI or runtime state. */
    collectBooks(): Book[];
    /** Collects settings from UI or runtime state. */
    collectSettings(): PlannerSettings;
    /** Normalized feature flags controlling optional runtime behavior. */
    featureFlags: FeatureFlags;
    /** Most recent planner output; null means no plan is currently loaded. */
    lastResult: PlannerResult | null;
    /** Normalized user experience preferences applied by the renderer. */
    preferences: Preferences;
    /** Completion flags keyed by session or schedule identifiers. */
    scheduleCompletions: Record<string, boolean>;
    /** Current reading session records from runtime state. */
    sessions: Session[];
}

/** Function signature for app log sink callbacks. */
export type AddLog = (message: string) => void;

/** Dependencies required to create the persistence queue. */
export interface PersistQueueArgs {
    /** Appends a diagnostic message to the in-app log. */
    addLog(this: void, message: string): void;
    /** Collects books from UI or runtime state. */
    collectBooks(this: void): Book[];
    /** Collects settings from UI or runtime state. */
    collectSettings(this: void): PlannerSettings;
    /** Returns sessions from current runtime state. */
    getSessions(this: void): Session[];
    /** Planner API subset used to persist serialized draft state. */
    plannerApi: Pick<PlannerApi, "saveState">;
    /** Mutable runtime state consumed and updated by this module. */
    state: PersistQueueState;
}

/** Persistence queue API used by runtime modules. */
export interface PersistQueue {
    /** Attempts an immediate draft save and resolves true on success. */
    persistDraft(): Promise<boolean>;
    /** Enqueues a debounced draft save. */
    queuePersist(): void;
}

/** Dashboard actions exposed to bootstrap and runtime flows. */
export interface DashboardRuntime {
    /** Reads preferences/flags from UI, normalizes them, and applies document settings. */
    applyExperienceSettings(): void;
    /** Recomputes and renders dashboard sections from current runtime state. */
    updateDashboards(): void;
}

/** Runtime callbacks invoked during initialization and tab interactions. */
export interface InitRuntime {
    /** Runs when book data changes and schedules downstream refresh/persist work. */
    handleBooksChanged(): void;
    /** Runs when schedule rows mutate and coordinates dashboard persistence updates. */
    handleScheduleMutation(): void;
    /** Responds to active-tab changes and triggers tab-specific side effects. */
    handleTabChange(name: string): void;
    /** Queues automatic planning when startup prerequisites are satisfied. */
    queueAutoPlanIfReady(): void;
    /** Registers or clears the current auto-plan capable controller. */
    setPlanController(controller: AutoPlanController | null): void;
}

/** Function signature for accessibility announcement callbacks. */
export type Announcer = (
    message: string,
    politeness?: AnnouncePoliteness,
) => void;

/** Shared context object passed into bootstrap wiring. */
export interface AppBootstrapContext {
    /** Appends a diagnostic message to the in-app log. */
    addLog(message: string): void;
    /** Live-region announcer used for accessibility updates. */
    announce: Announcer;
    /** Adapter used by plan-controller logic to announce status updates. */
    announceForPlanController(message: string, politeness?: string): void;
    /** Dashboard runtime used to refresh dashboard views. */
    dashboards: DashboardRuntime;
    /** Persists draft state to durable storage. */
    persistDraft(): Promise<boolean>;
    /** Planner API dependency used to call planner-side operations. */
    plannerApi: PlannerApi;
    /** Queues persist work for deferred execution. */
    queuePersist(): void;
    /** Initialization runtime handlers used by bootstrap wiring. */
    runtime: InitRuntime;
    /** Status callback used to publish user-visible loading or error messages. */
    setStatus(message: string, isError?: boolean): void;
    /** Mutable runtime state consumed and updated by this module. */
    state: AppRuntimeState;
}

/** Inputs used to construct dashboard update behavior. */
export interface DashboardRuntimeArgs {
    /** Applies normalized preferences to document/theme settings. */
    applyPreferencesToDocument(
        this: void,
        preferences: AppRuntimeState["preferences"],
    ): void;
    /** Collects all books from UI or runtime state. */
    collectAllBooks(this: void): Book[];
    /** Reads raw feature-flag values from UI controls. */
    collectFeatureFlagsFromUI(
        this: void,
    ): Partial<AppRuntimeState["featureFlags"]>;
    /** Reads raw preference values from UI controls. */
    collectPreferencesFromUI(
        this: void,
    ): Partial<AppRuntimeState["preferences"]>;
    /** Normalizes raw feature-flag values into canonical runtime flags. */
    normalizeFeatureFlags(
        this: void,
        flags: Partial<AppRuntimeState["featureFlags"]>,
    ): AppRuntimeState["featureFlags"];
    /** Normalizes raw preference values into canonical runtime preferences. */
    normalizePreferences(
        this: void,
        preferences: Partial<AppRuntimeState["preferences"]>,
    ): AppRuntimeState["preferences"];
    /** Queues persist work for deferred execution. */
    queuePersist(this: void): void;
    /** Mutable runtime state consumed and updated by this module. */
    state: AppRuntimeState;
    /** Renders statistics cards from a computed stats payload. */
    updateStatsView(
        this: void,
        payload: {
            books: Book[];
            sessions: AppRuntimeState["sessions"];
            lastResult: AppRuntimeState["lastResult"];
            scheduleCompletions: AppRuntimeState["scheduleCompletions"];
            dailyGoalMinutes: number;
        },
    ): void;
    /** Rebuilds the today dashboard view model and re-renders today cards. */
    updateTodayDashboard(
        this: void,
        payload: {
            books: Book[];
            defaultDailyGoalMinutes: number;
            featureFlags: AppRuntimeState["featureFlags"];
            lastResult: AppRuntimeState["lastResult"];
            preferences: AppRuntimeState["preferences"];
            scheduleCompletions: AppRuntimeState["scheduleCompletions"];
            sessions: AppRuntimeState["sessions"];
        },
    ): void;
}

/** Planner result subset needed when applying newly generated schedules. */
export type PlannerRunData = Pick<PlannerResult, "schedule" | "summary">;

/** Dependencies used when applying generated planner output to runtime state. */
export interface ApplyPlannedDataArgs {
    /** Planner data payload being applied to runtime and UI state. */
    data: PlannerRunData;
    /** Returns blocked day books from current runtime state. */
    getBlockedDayBooks(this: void): Record<string, boolean>;
    /** Returns last result from current runtime state. */
    getLastResult(this: void): PlannerResult | null;
    /** Returns schedule completions from current runtime state. */
    getScheduleCompletions(this: void): Record<string, boolean>;
    /** Returns sessions from current runtime state. */
    getSessions(this: void): Session[];
    /** Persists updated runtime state after planned data is applied. */
    persistDraft(this: void): Promise<boolean>;
    /** When true, blocked day-book pairs are preserved while applying new planner output. */
    preserveLockedDays: boolean;
    /** Renders schedule rows and day totals into the calendar UI. */
    renderCalendar(
        this: void,
        rows: PlannerScheduleRow[],
        totals: Record<string, number>,
    ): void;
    /** Updates book schedule rows in runtime state. */
    setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
    /** Updates last result in runtime state. */
    setLastResult(this: void, result: PlannerResult): void;
    /** Updates schedule completions in runtime state. */
    setScheduleCompletions(
        this: void,
        completions: Record<string, boolean>,
    ): void;
    /** Converts planner summary data into day-total minute map for calendar rendering. */
    totalsFromSummary(
        this: void,
        summary: PlannerSummary | null,
    ): Record<string, number>;
    /** Updates today view after related state changes. */
    updateTodayView(this: void): void;
}

/** Dependencies used when applying saved planner output at startup. */
export interface ApplyLoadedResultArgs {
    /** Records load-stage diagnostics while applying a saved result. */
    addLog(this: void, message: string): void;
    /** Fallback planner result used when no saved planner result exists. */
    defaultLastResult: PlannerResult;
    /** Renders calendar in the UI. */
    renderCalendar(
        this: void,
        rows: PlannerScheduleRow[],
        totals: Record<string, number>,
    ): void;
    /** Planner result loaded from persistence, if available. */
    savedResult: PlannerResult | null;
    /** Updates book schedule rows in runtime state. */
    setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
    /** Updates last result in runtime state. */
    setLastResult(this: void, result: PlannerResult): void;
    /** Converts a planner summary into per-day minute totals for calendar rendering. */
    totalsFromSummary(
        this: void,
        summary: PlannerSummary | null,
    ): Record<string, number>;
}

interface PlanCommonArgs {
    /** Appends a diagnostic message to the in-app log. */
    addLog(this: void, message: string): void;
    /** Announces generation progress/completion through accessibility live region. */
    announce(
        this: void,
        message: string,
        politeness?: "polite" | "assertive",
    ): void;
    /** Collects books from UI or runtime state. */
    collectBooks(this: void): Book[];
    /** Collects settings from UI or runtime state. */
    collectSettings(this: void): PlannerSettings;
    /** Planner API subset used for plan generation. */
    plannerApi: Pick<PlannerApi, "generate">;
    /** Status callback used to publish user-visible loading or error messages. */
    setStatus(this: void, message: string, isError?: boolean): void;
}

/** Inputs required to run plan generation with status and announcement handling. */
export interface RunPlanGenerationArgs extends PlanCommonArgs {
    /** Runs after successful generation to apply the generated schedule. */
    onSuccess(
        this: void,
        data: Pick<PlannerResult, "schedule" | "summary">,
    ): Promise<void>;
    /** Optional status text shown while plan generation is in progress. */
    statusGeneratingMessage?: string;
    /** Optional status text shown after plan generation succeeds. */
    statusSuccessMessage?: string;
    /** Optional live-region announcement spoken after successful generation. */
    successAnnouncement?: string;
}

/** Dependencies required to build the plan controller. */
export interface PlanControllerArgs extends PlanCommonArgs {
    /** Returns blocked day books from current runtime state. */
    getBlockedDayBooks(this: void): Record<string, boolean>;
    /** Returns last result from current runtime state. */
    getLastResult(this: void): PlannerResult | null;
    /** Returns schedule completions from current runtime state. */
    getScheduleCompletions(this: void): Record<string, boolean>;
    /** Returns sessions from current runtime state. */
    getSessions(this: void): Session[];
    /** Persists draft state to durable storage. */
    persistDraft(this: void): Promise<boolean>;
    /** Renders calendar in the UI. */
    renderCalendar(
        this: void,
        rows: PlannerScheduleRow[],
        totals: Record<string, number>,
    ): void;
    /** Updates book schedule rows in runtime state. */
    setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
    /** Updates last result in runtime state. */
    setLastResult(this: void, result: PlannerResult): void;
    /** Updates schedule completions in runtime state. */
    setScheduleCompletions(
        this: void,
        completions: Record<string, boolean>,
    ): void;
    /** Converts a planner summary into per-day minute totals for calendar rendering. */
    totalsFromSummary(
        this: void,
        summary: PlannerSummary | null,
    ): Record<string, number>;
    /** Updates today view after related state changes. */
    updateTodayView(this: void): void;
}

/** Plan controller contract used by runtime orchestration. */
export interface PlanController {
    /** Applies a loaded planner result and refreshes dependent runtime/UI state. */
    applyLoadedResult(savedResult: PlannerResult | null): void;
    /** Queues an automatic plan run if one is needed. */
    queueAutoPlan(): void;
}

/** Minimal contract for queueing automatic plan runs. */
export interface AutoPlanRunner {
    /** Queues auto plan work for deferred execution. */
    queueAutoPlan(): void;
}

/** Mutable flags tracking automatic-plan queue and execution state. */
export interface AutoPlanState {
    /** True while an automatic plan run is currently executing. */
    autoRunInFlight: boolean;
    /** True when an automatic plan run has been queued but not started yet. */
    autoRunPending: boolean;
}

/** Extra inputs for creating the deferred auto-plan runner. */
export interface RunAutoPlanFactoryArgs extends PlanControllerArgs {
    /** Schedules asynchronous auto-plan execution via runtime scheduler. */
    scheduleAutoPlan(this: void, runner: () => Promise<void>): void;
    /** Mutable runtime state consumed and updated by this module. */
    state: AutoPlanState;
}

/** Optional seed data used before persisted state has been loaded. */
export interface InitialDataSource {
    /** Current book collection used for planning, rendering, or stats. */
    books?: Book[];
    /** Optional initial planner settings used before persisted state is loaded. */
    settings?: PlannerSettings;
}

/** Dependencies for loading, normalizing, and applying persisted state. */
export interface LoadStateArgs {
    /** Optional logger used to record load/normalization diagnostics. */
    addLog?(message: string): void;
    /** Applies loaded planner result into state and calendar UI. */
    applyLoadedResult(result: PlannerResult | null): void;
    /** Applies normalized preferences to document styling/behavior. */
    applyPreferencesToDocument(preferences: Preferences): void;
    /** Hydrates books UI/state from loaded or sampled data. */
    fillBooks(books?: Book[]): void;
    /** Hydrates preferences controls from normalized preferences and flags. */
    fillPreferencesUI(
        preferences: Preferences,
        featureFlags: FeatureFlags,
    ): void;
    /** Hydrates settings UI/state from loaded or sampled data. */
    fillSettings(settings?: PlannerSettings): void;
    /** Normalizes raw feature-flag payload to canonical runtime flags. */
    normalizeFeatureFlags(raw: Partial<FeatureFlags>): FeatureFlags;
    /** Normalizes raw preferences payload to canonical runtime preferences. */
    normalizePreferences(raw: Partial<Preferences>): Preferences;
    /** Normalizes saved completion map to supported schedule keys. */
    normalizeScheduleCompletions(
        raw: Record<string, boolean>,
    ): Record<string, boolean>;
    /** Hook invoked after load completes with raw saved payload and load metadata. */
    onLoaded(
        saved: LoadedPlannerState | null | undefined,
        loadResult: PlannerStateLoadResult,
    ): void;
    /** Planner API subset used for loading or sampling initial data. */
    plannerApi: Pick<PlannerApi, "loadState" | "sample">;
    /** Updates blocked day books in runtime state. */
    setBlockedDayBooks(blockedDayBooks: Record<string, boolean>): void;
    /** Updates feature flags in runtime state. */
    setFeatureFlags(featureFlags: FeatureFlags): void;
    /** Updates preferences in runtime state. */
    setPreferences(preferences: Preferences): void;
    /** Updates schedule completions in runtime state. */
    setScheduleCompletions(scheduleCompletions: Record<string, boolean>): void;
    /** Updates sessions in runtime state. */
    setSessions(sessions: Session[]): void;
    /** Status callback used to publish user-visible loading or error messages. */
    setStatus(message: string, isError?: boolean): void;
    /** Recomputes today dashboard after load-state mutations are applied. */
    updateTodayView(): void;
}

/** Inputs used to assemble LoadStateArgs from bootstrap context. */
export interface CreateLoadStateArgsInput {
    /** Shared bootstrap context with runtime services and state. */
    context: AppBootstrapContext;
    /** Controller used to apply loaded planner results during initialization. */
    planController: LoadedResultController;
    /** Queues auto-planning when startup data is ready for generation. */
    queueAutoPlanIfReady(): void;
    /** Queues persistence after load-related mutations. */
    queuePersist(): void;
    /** Status callback used to publish user-visible loading or error messages. */
    setStatus: SetStatus;
    /** Mutable runtime state consumed and updated by this module. */
    state: AppBootstrapContext["state"];
    /** Refreshes today dashboard after load-time updates. */
    updateTodayView(): void;
}

/** Alias for PlanControllerArgs used by plan-controller construction helpers. */
export type CreatePlanControllerArgs = PlanControllerArgs;

/** Public auto-plan controller interface. */
export interface AutoPlanController {
    /** Queues auto plan work for deferred execution. */
    queueAutoPlan(): void;
}

/** Dependencies used to construct initialization runtime handlers. */
export interface InitRuntimeArgs {
    /** Moves keyboard focus to calendar today. */
    focusCalendarToday(): void;
    /** Queues persist work for deferred execution. */
    queuePersist(): void;
    /** Mutable runtime state consumed and updated by this module. */
    state: AppRuntimeState;
    /** Updates dashboards after related state changes. */
    updateDashboards(): void;
}

/** Interface for applying persisted planner results into runtime state. */
export interface LoadedResultController {
    /** Applies loaded result to runtime or UI state. */
    applyLoadedResult(result: PlannerResult): void;
}

/** Inputs used when finalizing startup after state load completes. */
export interface FinalizeInitialLoadArgs {
    /** Optional logger used for final startup diagnostics. */
    addLog?(message: string): void;
    /** Metadata returned by state loading that describes load outcome. */
    loadResult: PlannerStateLoadResult;
    /** Queues auto plan after startup data has been finalized. */
    queueAutoPlan(): void;
    /** Queues persistence for any load-time state normalization changes. */
    queuePersist(): void;
    /** Raw saved payload returned from persistence, used for final load decisions. */
    saved: { last_result?: PlannerResult | null } | null | undefined;
    /** Marks runtime state as ready for normal user interaction. */
    setReady(): void;
    /** Status callback used to publish user-visible loading or error messages. */
    setStatus: SetStatus;
}

/** Per-book summary data shown in the today dashboard. */
export interface TodayBookSummary {
    /** Book identifier associated with the row or progress change. */
    bookId: string;
    /** Number of sessions marked complete in the relevant scope. */
    completedSessions: number;
    /** Resolved cover-image source used by today cards. */
    coverSrc: string;
    /** Planned reading minutes for the summarized scope. */
    plannedMinutes: number;
    /** Total sessions scheduled in the summarized scope. */
    scheduledSessions: number;
    /** Book title associated with the row or summary item. */
    title: string;
}

/** Aggregated schedule metrics shown in today dashboard widgets. */
export interface TodayScheduleSnapshot {
    /** Per-book summaries for the current today dashboard snapshot. */
    books: TodayBookSummary[];
    /** Sum of planned minutes from sessions marked complete. */
    completedPlannedMinutes: number;
    /** Number of sessions marked complete in the relevant scope. */
    completedSessions: number;
    /** Next scheduled row that is not yet complete, or null when none remain. */
    nextUncompletedRow: PlannerScheduleRow | null;
    /** Total sessions scheduled in the summarized scope. */
    scheduledSessions: number;
}

/** Inputs used to rebuild today dashboard state from runtime data. */
export interface UpdateTodayDashboardArgs {
    /** Current book collection used for planning, rendering, or stats. */
    books: Book[];
    /** Default daily goal used when a custom goal is not available. */
    defaultDailyGoalMinutes: number;
    /** Normalized feature flags controlling optional runtime behavior. */
    featureFlags: FeatureFlags;
    /** Most recent planner output; null means no plan is currently loaded. */
    lastResult: PlannerResult | null;
    /** Normalized user experience preferences applied by the renderer. */
    preferences: Preferences;
    /** Completion flags keyed by session or schedule identifiers. */
    scheduleCompletions: Record<string, boolean>;
    /** Current reading session records from runtime state. */
    sessions: Session[];
}

/** Callbacks used by today cards to navigate to a specific book. */
export interface TodayBookNavigationActions {
    /** Switches UI to the books tab before scrolling to a book card. */
    activateBooksTab(): void;
    /** Scrolls the books view to the target book card. */
    scrollToBook(bookId: string): void;
}

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

/** Base dependencies for schedule row mutation operations. */
export interface SharedUpdateArgs {
    /** Applies state mutation to runtime or UI state. */
    applyStateMutation(mutation: AppStateMutation): void;
    /** Notifies listeners after shared update helpers mutate rows. */
    onScheduleRowsUpdated(): void;
    /** Queues persist work for deferred execution. */
    queuePersist(): void;
    /** Renders calendar in the UI. */
    renderCalendar(
        rows: PlannerScheduleRow[],
        totals: Record<string, number>,
    ): void;
    /** Updates book schedule rows in runtime state. */
    setBookScheduleRows(rows: PlannerScheduleRow[]): void;
    /** Updates last result in runtime state. */
    setLastResult(result: PlannerResult): void;
    /** Status callback used to publish user-visible loading or error messages. */
    setStatus(message: string, isError?: boolean): void;
    /** Mutable runtime state consumed and updated by this module. */
    state: {
        lastResult: PlannerResult | null;
        scheduleCompletions: Record<string, boolean>;
        blockedDayBooks: Record<string, boolean>;
    };
    /** Converts a planner summary into per-day minute totals for calendar rendering. */
    totalsFromSummary(summary: PlannerSummary | null): Record<string, number>;
}

/** Arguments required to append a manual session to the current schedule. */
export type AddManualSessionArgs = SharedUpdateArgs & {
    bookId: string;
    collectSettings(this: void): PlannerSettings;
    completed?: boolean;
    date: string;
    getBookById(this: void, bookId: string): Book | null;
    minutes: number;
};

/** Arguments required to remove a scheduled session row. */
export type RemoveSessionArgs = SharedUpdateArgs & {
    row: PlannerScheduleRow;
};

/** Arguments required to update the minutes on an existing scheduled session. */
export type UpdateSessionMinutesArgs = SharedUpdateArgs & {
    collectSettings(this: void): PlannerSettings;
    getBookById(this: void, bookId: string): Book | null;
    minutes: number;
    row: PlannerScheduleRow;
};

/** Minimal row metadata used while normalizing completion state. */
export interface CompletionRow {
    /** Book id referenced by the completion row payload. */
    book_id?: string;
    /** ISO date associated with the schedule row metadata. */
    date?: string;
    /** Book title associated with the row or summary item. */
    title?: string;
}

/** Result from schedule-row mutation helpers; null means no update was produced. */
export type UpdatedRowsResult = {
    normalizedMinutes: number;
    rows: PlannerScheduleRow[];
} | null;
