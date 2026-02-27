import type { Book, BookProgressUpdates } from "./types_books.js";
import type {
  CalendarHandlers,
} from "./types_calendar.js";
import type { Session } from "./types_core.js";
import type { FeatureFlags, Preferences } from "./types_experience.js";
import type {
  LoadedPlannerState,
  PlannerApi,
  PlannerResult,
  PlannerScheduleRow,
  PlannerSettings,
  PlannerSummary,
  PlannerStateLoadResult,
} from "./types_planner.js";

export type SetStatus = (message: string, isError?: boolean) => void;

export type AnnouncePoliteness = "polite" | "assertive";

export interface DocumentPreferencesInput {
  theme?: string;
  reduceMotion?: boolean;
}

export interface DialogFocusOptions {
  initialFocusSelector?: string | null;
}

export type LogLevel = "info" | "error";

export interface LogPayload {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

export interface ActivateTabOptions {
  focusPanel?: boolean;
}

export type ZoomApi = Pick<PlannerApi, "zoomIn" | "zoomOut" | "zoomReset">;

export interface ShortcutBindings {
  announce(this: void, message: string, politeness?: AnnouncePoliteness): void;
  plannerApi: ZoomApi;
}

export interface UpdateStatsArgs {
  books: Book[];
  sessions: Session[];
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  dailyGoalMinutes: number;
}

export type PlannerApiGlobal = typeof globalThis & { plannerApi?: PlannerApi };

export type DayMinutesMap = Map<string, number>;

export interface DayMinutesArgs {
  sessions: Session[];
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  year: number | null;
}

export interface AppRuntimeState {
  lastResult: PlannerResult | null;
  ready: boolean;
  preferences: Preferences;
  featureFlags: FeatureFlags;
  scheduleCompletions: Record<string, boolean>;
  blockedDayBooks: Record<string, boolean>;
  sessions: Session[];
  derived: AppDerivedIndexes;
}

export interface AppDerivedIndexes {
  bookById: Map<string, Book>;
  sessionsByDay: Map<string, Session[]>;
  sessionsByBook: Map<string, Session[]>;
  completionBySessionKey: Record<string, boolean>;
  completionByDayBookKey: Record<string, boolean>;
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

export type ApplyAppStateMutation = (
  state: AppRuntimeState,
  mutation: AppStateMutation,
) => void;

export interface AppStateMutationBindings {
  applyStateMutation(this: void, mutation: AppStateMutation): void;
  getState(this: void): AppRuntimeState;
}

export interface DraftDataParams {
  sessions: Session[];
  collectBooks(): Book[];
  collectSettings(): PlannerSettings;
  preferences: Preferences;
  featureFlags: FeatureFlags;
  scheduleCompletions: Record<string, boolean>;
  blockedDayBooks: Record<string, boolean>;
  lastResult: PlannerResult | null;
}

export type AddLog = (message: string) => void;

export interface PersistQueueState {
  ready: boolean;
  preferences: Preferences;
  featureFlags: FeatureFlags;
  scheduleCompletions: Record<string, boolean>;
  blockedDayBooks: Record<string, boolean>;
  lastResult: PlannerResult | null;
}

export interface PersistQueueArgs {
  plannerApi: Pick<PlannerApi, "saveState">;
  state: PersistQueueState;
  getSessions(this: void): Session[];
  collectBooks(this: void): Book[];
  collectSettings(this: void): PlannerSettings;
  addLog(this: void, message: string): void;
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
  announce: Announcer;
  announceForPlanController(message: string, politeness?: string): void;
  addLog(message: string): void;
  dashboards: DashboardRuntime;
  plannerApi: PlannerApi;
  persistDraft(): Promise<boolean>;
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
  collectFeatureFlagsFromUI(this: void): Partial<AppRuntimeState["featureFlags"]>;
  collectPreferencesFromUI(this: void): Partial<AppRuntimeState["preferences"]>;
  collectAllBooks(this: void): Book[];
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
  updateStatsView(this: void, payload: {
    books: Book[];
    sessions: AppRuntimeState["sessions"];
    lastResult: AppRuntimeState["lastResult"];
    scheduleCompletions: AppRuntimeState["scheduleCompletions"];
    dailyGoalMinutes: number;
  }): void;
  updateTodayDashboard(this: void, payload: {
    books: Book[];
    defaultDailyGoalMinutes: number;
    featureFlags: AppRuntimeState["featureFlags"];
    lastResult: AppRuntimeState["lastResult"];
    preferences: AppRuntimeState["preferences"];
    scheduleCompletions: AppRuntimeState["scheduleCompletions"];
    sessions: AppRuntimeState["sessions"];
  }): void;
}

export type PlannerRunData = Pick<PlannerResult, "schedule" | "summary">;

export interface ApplyPlannedDataArgs {
  data: PlannerRunData;
  preserveLockedDays: boolean;
  getLastResult(this: void): PlannerResult | null;
  getSessions(this: void): Session[];
  getBlockedDayBooks(this: void): Record<string, boolean>;
  getScheduleCompletions(this: void): Record<string, boolean>;
  setScheduleCompletions(
    this: void,
    completions: Record<string, boolean>,
  ): void;
  setLastResult(this: void, result: PlannerResult): void;
  setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
  renderCalendar(
    this: void,
    rows: PlannerScheduleRow[],
    totals: Record<string, number>,
  ): void;
  totalsFromSummary(this: void, summary: PlannerSummary | null): Record<string, number>;
  updateTodayView(this: void): void;
  persistDraft(this: void): Promise<boolean>;
}

export interface ApplyLoadedResultArgs {
  savedResult: PlannerResult | null;
  defaultLastResult: PlannerResult;
  setLastResult(this: void, result: PlannerResult): void;
  setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
  renderCalendar(
    this: void,
    rows: PlannerScheduleRow[],
    totals: Record<string, number>,
  ): void;
  totalsFromSummary(this: void, summary: PlannerSummary | null): Record<string, number>;
  addLog(this: void, message: string): void;
}

export interface RunPlanGenerationArgs {
  plannerApi: Pick<PlannerApi, "generate">;
  collectBooks(this: void): Book[];
  collectSettings(this: void): PlannerSettings;
  setStatus(this: void, message: string, isError?: boolean): void;
  addLog(this: void, message: string): void;
  announce(
    this: void,
    message: string,
    politeness?: "polite" | "assertive",
  ): void;
  onSuccess(
    this: void,
    data: Pick<PlannerResult, "schedule" | "summary">,
  ): Promise<void>;
  statusGeneratingMessage?: string;
  statusSuccessMessage?: string;
  successAnnouncement?: string;
}

export interface PlanControllerArgs {
  plannerApi: Pick<PlannerApi, "generate">;
  collectBooks(this: void): Book[];
  collectSettings(this: void): PlannerSettings;
  setStatus(this: void, message: string, isError?: boolean): void;
  addLog(this: void, message: string): void;
  announce(
    this: void,
    message: string,
    politeness?: "polite" | "assertive",
  ): void;
  getLastResult(this: void): PlannerResult | null;
  setLastResult(this: void, result: PlannerResult): void;
  getSessions(this: void): Session[];
  getScheduleCompletions(this: void): Record<string, boolean>;
  getBlockedDayBooks(this: void): Record<string, boolean>;
  setScheduleCompletions(
    this: void,
    completions: Record<string, boolean>,
  ): void;
  renderCalendar(
    this: void,
    rows: PlannerScheduleRow[],
    totals: Record<string, number>,
  ): void;
  totalsFromSummary(
    this: void,
    summary: PlannerSummary | null,
  ): Record<string, number>;
  setBookScheduleRows(this: void, rows: PlannerScheduleRow[]): void;
  updateTodayView(this: void): void;
  persistDraft(this: void): Promise<boolean>;
}

export interface PlanController {
  applyLoadedResult(savedResult: PlannerResult | null): void;
  queueAutoPlan(): void;
}

export interface AutoPlanRunner {
  queueAutoPlan(): void;
}

export interface AutoPlanState {
  autoRunPending: boolean;
  autoRunInFlight: boolean;
}

export interface RunAutoPlanFactoryArgs extends PlanControllerArgs {
  state: AutoPlanState;
  scheduleAutoPlan(this: void, runner: () => Promise<void>): void;
}

export interface InitialDataSource {
  settings?: PlannerSettings;
  books?: Book[];
}

export interface LoadStateArgs {
  plannerApi: Pick<PlannerApi, "loadState" | "sample">;
  fillSettings(settings?: PlannerSettings): void;
  fillBooks(books?: Book[]): void;
  normalizePreferences(raw: Partial<Preferences>): Preferences;
  normalizeFeatureFlags(raw: Partial<FeatureFlags>): FeatureFlags;
  normalizeScheduleCompletions(
    raw: Record<string, boolean>,
  ): Record<string, boolean>;
  fillPreferencesUI(preferences: Preferences, featureFlags: FeatureFlags): void;
  applyPreferencesToDocument(preferences: Preferences): void;
  setPreferences(preferences: Preferences): void;
  setFeatureFlags(featureFlags: FeatureFlags): void;
  setScheduleCompletions(scheduleCompletions: Record<string, boolean>): void;
  setBlockedDayBooks(blockedDayBooks: Record<string, boolean>): void;
  setSessions(sessions: Session[]): void;
  applyLoadedResult(result: PlannerResult | null): void;
  updateTodayView(): void;
  onLoaded(
    saved: LoadedPlannerState | null | undefined,
    loadResult: PlannerStateLoadResult,
  ): void;
  setStatus(message: string, isError?: boolean): void;
  addLog?(message: string): void;
}

export interface CreateLoadStateArgsInput {
  context: AppBootstrapContext;
  state: AppBootstrapContext["state"];
  planController: LoadedResultController;
  setStatus: SetStatus;
  queuePersist(): void;
  queueAutoPlanIfReady(): void;
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
  saved: { last_result?: PlannerResult | null } | null | undefined;
  loadResult: PlannerStateLoadResult;
  setReady(): void;
  queuePersist(): void;
  queueAutoPlan(): void;
  setStatus: SetStatus;
  addLog?(message: string): void;
}

export interface BindTodayActionsArgs {
  getLastResult(): PlannerResult | null;
  getScheduleCompletions(): Record<string, boolean>;
  setScheduleCompletions(nextCompletions: Record<string, boolean>): void;
  getSessions(): Session[];
  setSessions(nextSessions: Session[]): void;
  queuePersist(): void;
  updateTodayView(): void;
  setStatus: SetStatus;
}

export interface DashboardUpdateArgs {
  books: Book[];
  sessions: AppRuntimeState["sessions"];
  lastResult: AppRuntimeState["lastResult"];
  scheduleCompletions: AppRuntimeState["scheduleCompletions"];
  dailyGoalMinutes: number;
}

export interface TodayBookSummary {
  bookId: string;
  title: string;
  coverSrc: string;
  plannedMinutes: number;
  scheduledSessions: number;
  completedSessions: number;
}

export interface TodayScheduleSnapshot {
  nextUncompletedRow: PlannerScheduleRow | null;
  completedPlannedMinutes: number;
  scheduledSessions: number;
  completedSessions: number;
  books: TodayBookSummary[];
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
  setScheduleCompletions(nextCompletions: Record<string, boolean>): void;
  getSessions(): Session[];
  setSessions(nextSessions: Session[]): void;
  queuePersist(): void;
  updateTodayView(): void;
  setStatus: SetStatus;
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
  lastResult: PlannerResult | null;
  scheduleCompletions: Record<string, boolean>;
  books: Book[];
  sessions: Session[];
  preferences: Preferences;
  featureFlags: FeatureFlags;
  defaultDailyGoalMinutes: number;
}

export interface TodayBookNavigationActions {
  activateBooksTab(): void;
  scrollToBook(bookId: string): void;
}

export interface ScheduleRow {
  title?: string;
  date?: string;
  book_id?: string;
}

export interface CompletionUpdate {
  sessionKey: string;
  completed: boolean;
  row?: ScheduleRow;
}

export interface ProgressUpdateInput {
  bookId: string;
  pagesRead?: number | null;
  progressPercent?: number | null;
  row?: PlannerScheduleRow;
}

export interface ManualSessionAddInput {
  date: string;
  bookId: string;
  minutes: number;
  completed?: boolean;
}

export interface RemoveSessionInput {
  row: PlannerScheduleRow;
}

export interface MinutesUpdateInput {
  minutes: number;
  row: PlannerScheduleRow;
}

export type UpdatedBook = Book;

export interface AppCalendarInteractionArgs {
  configureCalendarInteractions(handlers?: Partial<CalendarHandlers>): void;
  state: {
    scheduleCompletions: Record<string, boolean>;
    blockedDayBooks: Record<string, boolean>;
    lastResult: PlannerResult | null;
  };
  queuePersist(): void;
  applyStateMutation(mutation: AppStateMutation): void;
  setStatus(message: string, isError?: boolean): void;
  collectSettings(): PlannerSettings;
  collectAllBooks(): Book[];
  setBookScheduleRows(rows: PlannerScheduleRow[]): void;
  renderCalendar(rows: PlannerScheduleRow[], totals: Record<string, number>): void;
  totalsFromSummary(summary: PlannerSummary | null): Record<string, number>;
  updateBookProgress(
    bookId: string,
    updates: BookProgressUpdates,
    options: { notifyBooksChanged?: boolean },
  ): UpdatedBook | null;
  getBookById(bookId: string): Book | null;
  setLastResult(result: PlannerResult): void;
  onSessionCompletionUpdated?(payload: CompletionUpdate): void;
  onProgressUpdated?(book: UpdatedBook): void;
  onScheduleRowsUpdated?(): void;
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
  onScheduleRowsUpdated(): void;
  applyStateMutation(mutation: AppStateMutation): void;
  queuePersist(): void;
  renderCalendar(rows: PlannerScheduleRow[], totals: Record<string, number>): void;
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
  date?: string;
  book_id?: string;
  title?: string;
}

export type UpdatedRowsResult = {
  normalizedMinutes: number;
  rows: PlannerScheduleRow[];
} | null;
