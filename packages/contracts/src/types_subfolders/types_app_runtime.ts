/**
 * App runtime, persistence, and bootstrap contract types.
 */

import type {
    AddLog,
    Announcer,
    BlockedDayBookState,
    BlockedDayBooks,
    PlannerInputCollectors,
    PlannerResultState,
    ScheduleCompletionState,
    ScheduleCompletions,
    SessionReader,
    SessionState,
    SetStatus,
} from "./types_app_shared.js";
import type { Book } from "./types_books.js";
import type { Session } from "./types_core.js";
import type { FeatureFlags, Preferences } from "./types_experience.js";
import type { PlannerApi, PlannerResult } from "./types_planner.js";

/** State snapshot consumed by the persistence queue. */
export interface PersistQueueState
    extends BlockedDayBookState,
        PlannerResultState,
        ScheduleCompletionState {
    /** Normalized feature flags controlling optional runtime behavior. */
    featureFlags: FeatureFlags;
    /** Normalized user experience preferences applied by the renderer. */
    preferences: Preferences;
    /** True once initial load finishes and runtime is ready for normal interactions. */
    ready: boolean;
}

/** Canonical mutable renderer state shared across app runtime modules. */
export interface AppRuntimeState extends PersistQueueState, SessionState {
    /** Derived lookup indexes computed from current runtime state. */
    derived: AppDerivedIndexes;
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
          scheduleCompletions: ScheduleCompletions;
      }
    | {
          type: "set_blocked_day_books";
          blockedDayBooks: BlockedDayBooks;
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
export interface DraftDataParams
    extends BlockedDayBookState,
        PlannerInputCollectors,
        PlannerResultState,
        ScheduleCompletionState,
        SessionState {
    /** Normalized feature flags controlling optional runtime behavior. */
    featureFlags: FeatureFlags;
    /** Normalized user experience preferences applied by the renderer. */
    preferences: Preferences;
}

/** Dependencies required to create the persistence queue. */
export interface PersistQueueArgs
    extends PlannerInputCollectors,
        SessionReader {
    /** Appends a diagnostic message to the in-app log. */
    addLog(this: void, message: string): void;
    /** Planner API subset used to persist serialized draft state. */
    plannerApi: Pick<PlannerApi, "saveState">;
    /** Mutable runtime state consumed and updated by this module. */
    state: PersistQueueState;
}

/** Persistence queue API used by runtime modules. */
export interface PersistQueue {
    /** Attempts an immediate draft save and resolves true on success. */
    persistDraft(): Promise<boolean>;
    /** Cancels queued draft saves and waits for any active save before replacing state externally. */
    prepareForStateImport(): Promise<void>;
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

/** Shared context object passed into bootstrap wiring. */
export interface AppBootstrapContext {
    /** Appends a diagnostic message to the in-app log. */
    addLog: AddLog;
    /** Live-region announcer used for accessibility updates. */
    announce: Announcer;
    /** Adapter used by plan-controller logic to announce status updates. */
    announceForPlanController(message: string, politeness?: string): void;
    /** Dashboard runtime used to refresh dashboard views. */
    dashboards: DashboardRuntime;
    /** Persists draft state to durable storage. */
    persistDraft(): Promise<boolean>;
    /** Waits for autosave to settle before importing an external state archive. */
    prepareForDataImport(): Promise<void>;
    /** Planner API dependency used to call planner-side operations. */
    plannerApi: PlannerApi;
    /** Queues persist work for deferred execution. */
    queuePersist(): void;
    /** Initialization runtime handlers used by bootstrap wiring. */
    runtime: InitRuntime;
    /** Status callback used to publish user-visible loading or error messages. */
    setStatus: SetStatus;
    /** Mutable runtime state consumed and updated by this module. */
    state: AppRuntimeState;
}

/** Public auto-plan controller interface. */
export interface AutoPlanController {
    /** Queues auto plan work for deferred execution. */
    queueAutoPlan(): void;
}
