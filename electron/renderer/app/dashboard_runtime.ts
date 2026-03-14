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
    const STATE = args.state;
    return (): void => {
        STATE.preferences = args.normalizePreferences(
            args.collectPreferencesFromUI(),
        );
        STATE.featureFlags = args.normalizeFeatureFlags(
            args.collectFeatureFlagsFromUI(),
        );
        args.applyPreferencesToDocument(STATE.preferences);
        updateDashboards();
        args.queuePersist();
    };
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
export function createDashboardRuntime({
    applyPreferencesToDocument,
    collectFeatureFlagsFromUI,
    collectPreferencesFromUI,
    collectAllBooks,
    normalizeFeatureFlags,
    normalizePreferences,
    queuePersist,
    state,
    updateStatsView,
    updateTodayDashboard,
}: DashboardRuntimeArgs): {
    applyExperienceSettings(): void;
    updateDashboards(): void;
} {
    const UPDATE_STATS_DASHBOARD_VIEW = createUpdateStatsDashboardView({
        collectAllBooks,
        state,
        updateStatsView,
    });
    const UPDATE_DASHBOARDS = createUpdateDashboards(
        { collectAllBooks, state, updateTodayDashboard },
        UPDATE_STATS_DASHBOARD_VIEW,
    );
    const APPLY_EXPERIENCE_SETTINGS = createApplyExperienceSettings(
        {
            applyPreferencesToDocument,
            collectFeatureFlagsFromUI,
            collectPreferencesFromUI,
            normalizeFeatureFlags,
            normalizePreferences,
            queuePersist,
            state,
        },
        UPDATE_DASHBOARDS,
    );
    return {
        applyExperienceSettings: APPLY_EXPERIENCE_SETTINGS,
        updateDashboards: UPDATE_DASHBOARDS,
    };
}
