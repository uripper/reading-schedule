import type { DashboardRuntimeArgs } from "../../types/types.ts";
import { DEFAULT_PREFERENCES } from "./experience/model.ts";

function createUpdateStatsDashboardView({
    collectAllBooks,
    state,
    updateStatsView,
}: Pick<
    DashboardRuntimeArgs,
    "collectAllBooks" | "state" | "updateStatsView"
>): () => void {
    return (): void => {
        updateStatsView({
            books: collectAllBooks(),
            dailyGoalMinutes: Number(state.preferences.dailyGoalMinutes),
            lastResult: state.lastResult,
            scheduleCompletions: state.scheduleCompletions,
            sessions: state.sessions,
        });
    };
}

function createUpdateDashboards(
    args: Pick<
        DashboardRuntimeArgs,
        "collectAllBooks" | "state" | "updateTodayDashboard"
    >,
    updateStatsDashboardView: () => void,
): () => void {
    return (): void => {
        args.updateTodayDashboard({
            books: args.collectAllBooks(),
            defaultDailyGoalMinutes: DEFAULT_PREFERENCES.dailyGoalMinutes,
            featureFlags: args.state.featureFlags,
            lastResult: args.state.lastResult,
            preferences: args.state.preferences,
            scheduleCompletions: args.state.scheduleCompletions,
            sessions: args.state.sessions,
        });
        updateStatsDashboardView();
    };
}

function createApplyExperienceSettings(
    args: Pick<
        DashboardRuntimeArgs,
        | "applyPreferencesToDocument"
        | "collectFeatureFlagsFromUI"
        | "collectPreferencesFromUI"
        | "normalizeFeatureFlags"
        | "normalizePreferences"
        | "queuePersist"
        | "state"
    >,
    updateDashboards: () => void,
): () => void {
    const APPLY_SETTINGS = (): void => {
        const STATE = args.state;
        STATE.preferences = args.normalizePreferences(
            args.collectPreferencesFromUI(),
        );
        STATE.featureFlags = args.normalizeFeatureFlags(
            args.collectFeatureFlagsFromUI(),
        );
        args.applyPreferencesToDocument(STATE.preferences);
    };
    return (): void => {
        APPLY_SETTINGS();
        updateDashboards();
        args.queuePersist();
    };
}

function dashboardRuntimeResult(
    applyExperienceSettings: () => void,
    updateDashboards: () => void,
): { applyExperienceSettings(): void; updateDashboards(): void } {
    return { applyExperienceSettings, updateDashboards };
}

/**
 * Creates dashboard update actions that keep Today/Stats panels in sync with UI preferences.
 * @param root0 - Runtime dependencies and mutable app state for dashboard updates.
 * @param applyPreferencesToDocument - Applies visual preference changes to the document root.
 * @param collectFeatureFlagsFromUI - Reads current feature flags from settings controls.
 * @param collectPreferencesFromUI - Reads current preference values from settings controls.
 * @param collectAllBooks - Returns all books currently present in the catalog.
 * @param normalizeFeatureFlags - Normalizes partial flag values into a complete feature flag object.
 * @param normalizePreferences - Normalizes partial preferences into a complete preferences object.
 * @param queuePersist - Schedules state persistence after preference/flag updates.
 * @param state - Shared mutable runtime state used by dashboard rendering.
 * @param updateStatsView - Renders the Stats dashboard from latest state values.
 * @param updateTodayDashboard - Renders the Today dashboard from latest state values.
 * @returns Dashboard action handlers for applying settings and repainting both dashboards.
 */
export function createDashboardRuntime({ ...args }: DashboardRuntimeArgs): {
    applyExperienceSettings(): void;
    updateDashboards(): void;
} {
    const UPDATE_STATS_DASHBOARD_VIEW = createUpdateStatsDashboardView(args);
    const UPDATE_DASHBOARDS = createUpdateDashboards(
        args,
        UPDATE_STATS_DASHBOARD_VIEW,
    );
    const APPLY_EXPERIENCE_SETTINGS = createApplyExperienceSettings(
        args,
        UPDATE_DASHBOARDS,
    );
    return dashboardRuntimeResult(APPLY_EXPERIENCE_SETTINGS, UPDATE_DASHBOARDS);
}
