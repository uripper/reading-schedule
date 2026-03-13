/**
 * Dashboard and today-view contract types for the app runtime.
 */

import type { AppRuntimeState } from "./types_app_runtime.js";
import type {
    BookCollectionState,
    DashboardStatsPayload,
    PlannerResultState,
    ScheduleCompletionState,
    SessionState,
} from "./types_app_shared.js";
import type { Book } from "./types_books.js";
import type { FeatureFlags, Preferences } from "./types_experience.js";
import type { PlannerScheduleRow } from "./types_planner.js";

/** Inputs used to rebuild today dashboard state from runtime data. */
export interface TodayDashboardPayload
    extends BookCollectionState,
        PlannerResultState,
        ScheduleCompletionState,
        SessionState {
    /** Default daily goal used when a custom goal is not available. */
    defaultDailyGoalMinutes: number;
    /** Normalized feature flags controlling optional runtime behavior. */
    featureFlags: FeatureFlags;
    /** Normalized user experience preferences applied by the renderer. */
    preferences: Preferences;
}

/** Inputs used to rebuild today dashboard state from runtime data. */
export type UpdateTodayDashboardArgs = TodayDashboardPayload;

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
    updateStatsView(this: void, payload: DashboardStatsPayload): void;
    /** Rebuilds the today dashboard view model and re-renders today cards. */
    updateTodayDashboard(this: void, payload: TodayDashboardPayload): void;
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

/** Callbacks used by today cards to navigate to a specific book. */
export interface TodayBookNavigationActions {
    /** Switches UI to the books tab before scrolling to a book card. */
    activateBooksTab(): void;
    /** Scrolls the books view to the target book card. */
    scrollToBook(bookId: string): void;
}
