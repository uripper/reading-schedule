/**
 * Planning, initialization, and load-state contract types for the app runtime.
 */

import type { AppBootstrapContext } from "./types_app_runtime.ts";
import type {
    AddLog,
    AnnouncePoliteness,
    BlockedDayBookReader,
    BlockedDayBooks,
    PlannerCalendarBindings,
    PlannerInputCollectors,
    PlannerStateReaders,
    ScheduleCompletions,
    ScheduleCompletionWriter,
    SetStatus,
} from "./types_app_shared.ts";
import type { Book } from "./types_books.ts";
import type { Session } from "./types_core.ts";
import type { FeatureFlags, Preferences } from "./types_experience.ts";
import type {
    LoadedPlannerState,
    PlannerApi,
    PlannerResult,
    PlannerSettings,
    PlannerStateLoadResult,
} from "./types_planner.ts";

/** Planner result subset needed when applying newly generated schedules. */
export type PlannerRunData = Pick<PlannerResult, "schedule" | "summary">;

/** Dependencies used when applying generated planner output to runtime state. */
export interface ApplyPlannedDataArgs
    extends BlockedDayBookReader,
        PlannerCalendarBindings,
        PlannerStateReaders,
        ScheduleCompletionWriter {
    /** Planner data payload being applied to runtime and UI state. */
    data: PlannerRunData;
    /** Persists updated runtime state after planned data is applied. */
    persistDraft(this: void): Promise<boolean>;
    /** When true, blocked day-book pairs are preserved while applying new planner output. */
    preserveLockedDays: boolean;
    /** Updates today view after related state changes. */
    updateTodayView(this: void): void;
}

/** Dependencies used when applying saved planner output at startup. */
export interface ApplyLoadedResultArgs extends PlannerCalendarBindings {
    /** Records load-stage diagnostics while applying a saved result. */
    addLog(this: void, message: string): void;
    /** Fallback planner result used when no saved planner result exists. */
    defaultLastResult: PlannerResult;
    /** Planner result loaded from persistence, if available. */
    savedResult: PlannerResult | null;
}

/** Shared planning dependencies used by manual and automatic plan flows. */
export interface PlanCommonArgs extends PlannerInputCollectors {
    /** Appends a diagnostic message to the in-app log. */
    addLog(this: void, message: string): void;
    /** Announces generation progress/completion through accessibility live region. */
    announce(
        this: void,
        message: string,
        politeness?: AnnouncePoliteness,
    ): void;
    /** Planner API subset used for plan generation. */
    plannerApi: Pick<PlannerApi, "generate">;
    /** Status callback used to publish user-visible loading or error messages. */
    setStatus: SetStatus;
}

/** Inputs required to run plan generation with status and announcement handling. */
export interface RunPlanGenerationArgs extends PlanCommonArgs {
    /** Returns false after this run has been superseded by newer planning input. */
    isRunCurrent?(this: void): boolean;
    /** Runs after successful generation to apply the generated schedule. */
    onSuccess(this: void, data: PlannerRunData): Promise<void>;
    /** Optional status text shown while plan generation is in progress. */
    statusGeneratingMessage?: string;
    /** Optional status text shown after plan generation succeeds. */
    statusSuccessMessage?: string;
    /** Optional live-region announcement spoken after successful generation. */
    successAnnouncement?: string;
}

/** Dependencies required to build the plan controller. */
export interface PlanControllerArgs
    extends BlockedDayBookReader,
        PlanCommonArgs,
        PlannerCalendarBindings,
        PlannerStateReaders,
        ScheduleCompletionWriter {
    /** Persists draft state to durable storage. */
    persistDraft(this: void): Promise<boolean>;
    /** Updates today view after related state changes. */
    updateTodayView(this: void): void;
}

/** Alias for PlanControllerArgs used by plan-controller construction helpers. */
export type CreatePlanControllerArgs = PlanControllerArgs;

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
    /** Count of automatic planner requests still awaiting completion. */
    activeRunCount: number;
    /** True while an automatic plan run is currently executing. */
    autoRunInFlight: boolean;
    /** True when an automatic plan run has been queued but not started yet. */
    autoRunPending: boolean;
    /** Monotonic request version used to ignore superseded auto-plan results. */
    autoRunVersion: number;
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
    addLog?: AddLog;
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
    normalizeScheduleCompletions(raw: ScheduleCompletions): ScheduleCompletions;
    /** Hook invoked after load completes with raw saved payload and load metadata. */
    onLoaded(
        saved: LoadedPlannerState | null | undefined,
        loadResult: PlannerStateLoadResult,
    ): void;
    /** Planner API subset used for loading or sampling initial data. */
    plannerApi: Pick<PlannerApi, "loadState" | "sample">;
    /** Updates blocked day books in runtime state. */
    setBlockedDayBooks(blockedDayBooks: BlockedDayBooks): void;
    /** Updates feature flags in runtime state. */
    setFeatureFlags(featureFlags: FeatureFlags): void;
    /** Updates preferences in runtime state. */
    setPreferences(preferences: Preferences): void;
    /** Updates schedule completions in runtime state. */
    setScheduleCompletions(scheduleCompletions: ScheduleCompletions): void;
    /** Updates sessions in runtime state. */
    setSessions(sessions: Session[]): void;
    /** Status callback used to publish user-visible loading or error messages. */
    setStatus: SetStatus;
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

/** Interface for applying persisted planner results into runtime state. */
export interface LoadedResultController {
    /** Applies loaded result to runtime or UI state. */
    applyLoadedResult(result: PlannerResult): void;
}

/** Inputs used when finalizing startup after state load completes. */
export interface FinalizeInitialLoadArgs {
    /** Optional logger used for final startup diagnostics. */
    addLog?: AddLog;
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
