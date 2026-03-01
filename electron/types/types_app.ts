import { type Book, type BookProgressUpdates } from "./types_books.js";
import { type CalendarHandlers } from "./types_calendar.js";
import { type Session } from "./types_core.js";
import { type FeatureFlags, type Preferences } from "./types_experience.js";
import {
    type LoadedPlannerState,
    type PlannerApi,
    type PlannerResult,
    type PlannerScheduleRow,
    type PlannerSettings,
    type PlannerStateLoadResult,
    type PlannerSummary,
} from "./types_planner.js";

export type SetStatus = (message: string, isError?: boolean) => void;

export type AnnouncePoliteness = "polite" | "assertive";

export interface DocumentPreferencesInput {
    reduceMotion?: boolean;
    theme?: string;
}

export interface DialogFocusOptions {
    initialFocusSelector?: string | null;
}

export type LogLevel = "info" | "error";

export interface LogPayload {
    context?: Record<string, unknown>;
    error?: unknown;
    level: LogLevel;
    message: string;
}

export interface ActivateTabOptions {
    focusPanel?: boolean;
}

export type ZoomApi = Pick<PlannerApi, "zoomIn" | "zoomOut" | "zoomReset">;

export interface ShortcutBindings {
    announce(
        this: void,
        message: string,
        politeness?: AnnouncePoliteness,
    ): void;
    plannerApi: ZoomApi;
}

export interface UpdateStatsArgs {
    books: Book[];
    dailyGoalMinutes: number;
    lastResult: PlannerResult | null;
    scheduleCompletions: Record<string, boolean>;
    sessions: Session[];
}

export type PlannerApiGlobal = typeof globalThis & { plannerApi?: PlannerApi };

export type DayMinutesMap = Map<string, number>;

export interface DayMinutesArgs {
    lastResult: PlannerResult | null;
    scheduleCompletions: Record<string, boolean>;
    sessions: Session[];
    year: number | null;
}

export interface AppRuntimeState {
    blockedDayBooks: Record<string, boolean>;
    derived: AppDerivedIndexes;
    featureFlags: FeatureFlags;
    lastResult: PlannerResult | null;
    preferences: Preferences;
    ready: boolean;
    scheduleCompletions: Record<string, boolean>;
    sessions: Session[];
}

export interface AppDerivedIndexes {
    bookById: Map<string, Book>;
    completionByDayBookKey: Record<string, boolean>;
    completionBySessionKey: Record<string, boolean>;
    sessionsByBook: Map<string, Session[]>;
    sessionsByDay: Map<string, Session[]>;
}

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

export interface DraftDataParams {
    blockedDayBooks: Record<string, boolean>;
    collectBooks(): Book[];
    collectSettings(): PlannerSettings;
    featureFlags: FeatureFlags;
    lastResult: PlannerResult | null;
    preferences: Preferences;
    scheduleCompletions: Record<string, boolean>;
    sessions: Session[];
}

export type AddLog = (message: string) => void;

export interface PersistQueueState {
    blockedDayBooks: Record<string, boolean>;
    featureFlags: FeatureFlags;
    lastResult: PlannerResult | null;
    preferences: Preferences;
    ready: boolean;
    scheduleCompletions: Record<string, boolean>;
}

export interface PersistQueueArgs {
    addLog(this: void, message: string): void;
    collectBooks(this: void): Book[];
    collectSettings(this: void): PlannerSettings;
    getSessions(this: void): Session[];
    plannerApi: Pick<PlannerApi, "saveState">;
    state: PersistQueueState;
}

export interface PersistQueue {
    persistDraft(): Promise<boolean>;
    queuePersist(): void;
}

export interface DashboardRuntime {
    applyExperienceSettings(): void;
    updateDashboards(): void;
}

export interface InitRuntime {
    handleBooksChanged(): void;
    handleScheduleMutation(): void;
    handleTabChange(name: string): void;
    queueAutoPlanIfReady(): void;
    setPlanController(controller: AutoPlanController | null): void;
}

export type Announcer = (
    message: string,
    politeness?: AnnouncePoliteness,
) => void;

export interface AppBootstrapContext {
    addLog(message: string): void;
    announce: Announcer;
    announceForPlanController(message: string, politeness?: string): void;
    dashboards: DashboardRuntime;
    persistDraft(): Promise<boolean>;
    plannerApi: PlannerApi;
    queuePersist(): void;
    runtime: InitRuntime;
    setStatus(message: string, isError?: boolean): void;
    state: AppRuntimeState;
}

export interface DashboardRuntimeArgs {
    applyPreferencesToDocument(
        this: void,
        preferences: AppRuntimeState["preferences"],
    ): void;
    collectAllBooks(this: void): Book[];
    collectFeatureFlagsFromUI(
        this: void,
    ): Partial<AppRuntimeState["featureFlags"]>;
    collectPreferencesFromUI(
        this: void,
    ): Partial<AppRuntimeState["preferences"]>;
    normalizeFeatureFlags(
        this: void,
        flags: Partial<AppRuntimeState["featureFlags"]>,
    ): AppRuntimeState["featureFlags"];
    normalizePreferences(
        this: void,
        preferences: Partial<AppRuntimeState["preferences"]>,
    ): AppRuntimeState["preferences"];
    queuePersist(this: void): void;
    state: AppRuntimeState;
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

export type PlannerRunData = Pick<PlannerResult, "schedule" | "summary">;

export interface ApplyPlannedDataArgs {
    data: PlannerRunData;
    getBlockedDayBooks(this: void): Record<string, boolean>;
    getLastResult(this: void): PlannerResult | null;
    getScheduleCompletions(this: void): Record<string, boolean>;
    getSessions(this: void): Session[];
    persistDraft(this: void): Promise<boolean>;
    preserveLockedDays: boolean;
    renderCalendar(
        this: void,
        rows: PlannerScheduleRow[],
        totals: Record<string, number>,
    ): void;
    setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
    setLastResult(this: void, result: PlannerResult): void;
    setScheduleCompletions(
        this: void,
        completions: Record<string, boolean>,
    ): void;
    totalsFromSummary(
        this: void,
        summary: PlannerSummary | null,
    ): Record<string, number>;
    updateTodayView(this: void): void;
}

export interface ApplyLoadedResultArgs {
    addLog(this: void, message: string): void;
    defaultLastResult: PlannerResult;
    renderCalendar(
        this: void,
        rows: PlannerScheduleRow[],
        totals: Record<string, number>,
    ): void;
    savedResult: PlannerResult | null;
    setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
    setLastResult(this: void, result: PlannerResult): void;
    totalsFromSummary(
        this: void,
        summary: PlannerSummary | null,
    ): Record<string, number>;
}

export interface RunPlanGenerationArgs {
    addLog(this: void, message: string): void;
    announce(
        this: void,
        message: string,
        politeness?: "polite" | "assertive",
    ): void;
    collectBooks(this: void): Book[];
    collectSettings(this: void): PlannerSettings;
    onSuccess(
        this: void,
        data: Pick<PlannerResult, "schedule" | "summary">,
    ): Promise<void>;
    plannerApi: Pick<PlannerApi, "generate">;
    setStatus(this: void, message: string, isError?: boolean): void;
    statusGeneratingMessage?: string;
    statusSuccessMessage?: string;
    successAnnouncement?: string;
}

export interface PlanControllerArgs {
    addLog(this: void, message: string): void;
    announce(
        this: void,
        message: string,
        politeness?: "polite" | "assertive",
    ): void;
    collectBooks(this: void): Book[];
    collectSettings(this: void): PlannerSettings;
    getBlockedDayBooks(this: void): Record<string, boolean>;
    getLastResult(this: void): PlannerResult | null;
    getScheduleCompletions(this: void): Record<string, boolean>;
    getSessions(this: void): Session[];
    persistDraft(this: void): Promise<boolean>;
    plannerApi: Pick<PlannerApi, "generate">;
    renderCalendar(
        this: void,
        rows: PlannerScheduleRow[],
        totals: Record<string, number>,
    ): void;
    setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
    setLastResult(this: void, result: PlannerResult): void;
    setScheduleCompletions(
        this: void,
        completions: Record<string, boolean>,
    ): void;
    setStatus(this: void, message: string, isError?: boolean): void;
    totalsFromSummary(
        this: void,
        summary: PlannerSummary | null,
    ): Record<string, number>;
    updateTodayView(this: void): void;
}

export interface PlanController {
    applyLoadedResult(savedResult: PlannerResult | null): void;
    queueAutoPlan(): void;
}

export interface AutoPlanRunner {
    queueAutoPlan(): void;
}

export interface AutoPlanState {
    autoRunInFlight: boolean;
    autoRunPending: boolean;
}

export interface RunAutoPlanFactoryArgs extends PlanControllerArgs {
    scheduleAutoPlan(this: void, runner: () => Promise<void>): void;
    state: AutoPlanState;
}

export interface InitialDataSource {
    books?: Book[];
    settings?: PlannerSettings;
}

export interface LoadStateArgs {
    addLog?(message: string): void;
    applyLoadedResult(result: PlannerResult | null): void;
    applyPreferencesToDocument(preferences: Preferences): void;
    fillBooks(books?: Book[]): void;
    fillPreferencesUI(
        preferences: Preferences,
        featureFlags: FeatureFlags,
    ): void;
    fillSettings(settings?: PlannerSettings): void;
    normalizeFeatureFlags(raw: Partial<FeatureFlags>): FeatureFlags;
    normalizePreferences(raw: Partial<Preferences>): Preferences;
    normalizeScheduleCompletions(
        raw: Record<string, boolean>,
    ): Record<string, boolean>;
    onLoaded(
        saved: LoadedPlannerState | null | undefined,
        loadResult: PlannerStateLoadResult,
    ): void;
    plannerApi: Pick<PlannerApi, "loadState" | "sample">;
    setBlockedDayBooks(blockedDayBooks: Record<string, boolean>): void;
    setFeatureFlags(featureFlags: FeatureFlags): void;
    setPreferences(preferences: Preferences): void;
    setScheduleCompletions(scheduleCompletions: Record<string, boolean>): void;
    setSessions(sessions: Session[]): void;
    setStatus(message: string, isError?: boolean): void;
    updateTodayView(): void;
}

export interface CreateLoadStateArgsInput {
    context: AppBootstrapContext;
    planController: LoadedResultController;
    queueAutoPlanIfReady(): void;
    queuePersist(): void;
    setStatus: SetStatus;
    state: AppBootstrapContext["state"];
    updateTodayView(): void;
}

export type CreatePlanControllerArgs = PlanControllerArgs;

export interface AutoPlanController {
    queueAutoPlan(): void;
}

export interface InitRuntimeArgs {
    focusCalendarToday(): void;
    queuePersist(): void;
    state: AppRuntimeState;
    updateDashboards(): void;
}

export interface LoadedResultController {
    applyLoadedResult(result: PlannerResult): void;
}

export interface FinalizeInitialLoadArgs {
    addLog?(message: string): void;
    loadResult: PlannerStateLoadResult;
    queueAutoPlan(): void;
    queuePersist(): void;
    saved: { last_result?: PlannerResult | null } | null | undefined;
    setReady(): void;
    setStatus: SetStatus;
}

export interface BindTodayActionsArgs {
    getLastResult(): PlannerResult | null;
    getScheduleCompletions(): Record<string, boolean>;
    getSessions(): Session[];
    queuePersist(): void;
    setScheduleCompletions(nextCompletions: Record<string, boolean>): void;
    setSessions(nextSessions: Session[]): void;
    setStatus: SetStatus;
    updateTodayView(): void;
}


export interface TodayBookSummary {
    bookId: string;
    completedSessions: number;
    coverSrc: string;
    plannedMinutes: number;
    scheduledSessions: number;
    title: string;
}

export interface TodayScheduleSnapshot {
    books: TodayBookSummary[];
    completedPlannedMinutes: number;
    completedSessions: number;
    nextUncompletedRow: PlannerScheduleRow | null;
    scheduledSessions: number;
}

export interface TodayFocusDomRefs {
    focusCompleteButton: HTMLButtonElement;
    focusEntryButton: HTMLButtonElement;
    focusFeedback: HTMLElement;
    focusPanel: HTMLElement;
    focusSessionMeta: HTMLElement;
    focusSessionText: HTMLElement;
    focusStartButton: HTMLButtonElement;
    focusTinyStartButton: HTMLButtonElement;
}

export interface BindTodayFocusActionsArgs {
    getLastResult(): PlannerResult | null;
    getScheduleCompletions(): Record<string, boolean>;
    getSessions(): Session[];
    queuePersist(): void;
    setScheduleCompletions(nextCompletions: Record<string, boolean>): void;
    setSessions(nextSessions: Session[]): void;
    setStatus: SetStatus;
    updateTodayView(): void;
}

export interface FocusSession {
    bookId: string;
    date: string;
    minutes: number;
    sessionIndex: number | null;
    title: string;
}

export interface TodayFocusState {
    feedback: string;
    isOpen: boolean;
    isStarted: boolean;
    session: FocusSession | null;
}

export interface UpdateTodayDashboardArgs {
    books: Book[];
    defaultDailyGoalMinutes: number;
    featureFlags: FeatureFlags;
    lastResult: PlannerResult | null;
    preferences: Preferences;
    scheduleCompletions: Record<string, boolean>;
    sessions: Session[];
}

export interface TodayBookNavigationActions {
    activateBooksTab(): void;
    scrollToBook(bookId: string): void;
}

export interface ScheduleRow {
    book_id?: string;
    date?: string;
    title?: string;
}

export interface CompletionUpdate {
    completed: boolean;
    row?: ScheduleRow;
    sessionKey: string;
}

export interface ProgressUpdateInput {
    bookId: string;
    pagesRead?: number | null;
    progressPercent?: number | null;
    row?: PlannerScheduleRow;
}


export type UpdatedBook = Book;

export interface AppCalendarInteractionArgs {
    applyStateMutation(mutation: AppStateMutation): void;
    collectAllBooks(): Book[];
    collectSettings(): PlannerSettings;
    configureCalendarInteractions(handlers?: Partial<CalendarHandlers>): void;
    getBookById(bookId: string): Book | null;
    onProgressUpdated?(book: UpdatedBook): void;
    onScheduleRowsUpdated?(): void;
    onSessionCompletionUpdated?(payload: CompletionUpdate): void;
    queuePersist(): void;
    renderCalendar(
        rows: PlannerScheduleRow[],
        totals: Record<string, number>,
    ): void;
    setBookScheduleRows(rows: PlannerScheduleRow[]): void;
    setLastResult(result: PlannerResult): void;
    setStatus(message: string, isError?: boolean): void;
    state: {
        scheduleCompletions: Record<string, boolean>;
        blockedDayBooks: Record<string, boolean>;
        lastResult: PlannerResult | null;
    };
    totalsFromSummary(summary: PlannerSummary | null): Record<string, number>;
    updateBookProgress(
        bookId: string,
        updates: BookProgressUpdates,
        options: { notifyBooksChanged?: boolean },
    ): UpdatedBook | null;
}

export type CalendarInteractionHandlers = Partial<CalendarHandlers>;

export type ScheduleMutationHandlers = Pick<
    CalendarHandlers,
    "onManualSessionAdded" | "onSessionMinutesUpdated" | "onSessionRemoved"
>;

export interface SharedScheduleBindings {
    applyStateMutation: AppCalendarInteractionArgs["applyStateMutation"];
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
    applyStateMutation(mutation: AppStateMutation): void;
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

export interface CompletionRow {
    book_id?: string;
    date?: string;
    title?: string;
}

export type UpdatedRowsResult = {
    normalizedMinutes: number;
    rows: PlannerScheduleRow[];
} | null;
