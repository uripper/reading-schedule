import {
    type AppBootstrapContext,
    type PlannerResult,
} from "../../../types/types.js";
import {
    bindBooksUI,
    collectAllBooks,
    collectBooks,
    getBookById,
    setBookCommitHook,
    setBookScheduleRows,
    updateBookProgress,
} from "../../books.js";
import {
    configureCalendarInteractions,
    focusCalendarDate,
    renderCalendar,
} from "../../calendar.js";
import { addLog, bindHelpDialog } from "../../help.js";
import { collectSettings, initSettingsGrid } from "../../settings.js";
import { bindDesktopShortcuts } from "../../shortcuts/index.js";
import { activateTab, bindTabs } from "../../tabs.js";
import { configureAppCalendarInteractions } from "../calendar_interactions/index.js";
import { bindExperienceSettings } from "../experience/index.js";
import { totalsFromSummary } from "../runtime_helpers.js";
import { applyAppStateMutation } from "../state_mutations.js";
import { loadStateAndBindTodayActions } from "./init_app_load.js";
import {
    createAppPlanControllerInstance,
    setupSkipLink,
} from "./init_helpers.js";

/**
 * Creates the app-level plan controller instance with runtime-bound callbacks.
 * @param appContext Shared bootstrap context.
 * @returns Plan controller instance.
 */
function buildPlanController(
    appContext: AppBootstrapContext,
): ReturnType<typeof createAppPlanControllerInstance> {
    const runtimeState = appContext.state;
    return createAppPlanControllerInstance({
        addLog,
        announce: (
            message: string,
            politeness?: "polite" | "assertive",
        ): void => {
            appContext.announceForPlanController(message, politeness);
        },
        collectBooks,
        collectSettings,
        getBlockedDayBooks: (): Record<string, boolean> =>
            runtimeState.blockedDayBooks,
        getLastResult: (): PlannerResult | null => runtimeState.lastResult,
        getScheduleCompletions: (): Record<string, boolean> =>
            runtimeState.scheduleCompletions,
        getSessions: (): typeof runtimeState.sessions => runtimeState.sessions,
        persistDraft: async (): Promise<boolean> =>
            await appContext.persistDraft(),
        plannerApi: appContext.plannerApi,
        renderCalendar,
        setBookScheduleRows,
        setLastResult: (nextResult: PlannerResult) => {
            applyAppStateMutation(runtimeState, {
                lastResult: nextResult,
                type: "set_last_result",
            });
        },
        setScheduleCompletions: (nextCompletions: Record<string, boolean>) => {
            applyAppStateMutation(runtimeState, {
                scheduleCompletions: nextCompletions,
                type: "set_schedule_completions",
            });
        },
        setStatus: (message: string, isError?: boolean): void => {
            appContext.setStatus(message, isError);
        },
        totalsFromSummary,
        updateTodayView: (): void => {
            appContext.dashboards.updateDashboards();
        },
    });
}

/**
 * Wires calendar interaction handlers against app runtime callbacks/state.
 * @param appContext Shared bootstrap context.
 */
function configureCalendarAppInteractions(
    appContext: AppBootstrapContext,
): void {
    const runtimeState = appContext.state;
    configureAppCalendarInteractions({
        applyStateMutation: (mutation) => {
            applyAppStateMutation(runtimeState, mutation);
        },
        collectAllBooks,
        collectSettings,
        configureCalendarInteractions,
        getBookById,
        onProgressUpdated: (): void => {
            appContext.runtime.handleScheduleMutation();
        },
        onScheduleRowsUpdated: (): void => {
            appContext.dashboards.updateDashboards();
        },
        onSessionCompletionUpdated: (): void => {
            appContext.runtime.handleScheduleMutation();
        },
        queuePersist: (): void => {
            appContext.queuePersist();
        },
        renderCalendar,
        setBookScheduleRows,
        setLastResult: (nextResult: PlannerResult) => {
            applyAppStateMutation(runtimeState, {
                lastResult: nextResult,
                type: "set_last_result",
            });
        },
        setStatus: (message: string, isError?: boolean): void => {
            appContext.setStatus(message, isError);
        },
        state: runtimeState,
        totalsFromSummary,
        updateBookProgress,
    });
}

/**
 * Initializes renderer app bindings, controllers, and startup data load.
 * @param context Bootstrap context containing APIs, state, and runtime hooks.
 * @returns Promise that resolves after startup load/bind operations complete.
 */
export async function initApp(context: AppBootstrapContext): Promise<void> {
    const appContext = context;
    setupSkipLink();
    bindDesktopShortcuts({
        announce: appContext.announce,
        plannerApi: appContext.plannerApi,
    });
    initSettingsGrid();
    bindTabs((name: string): void => {
        appContext.runtime.handleTabChange(name);
    });
    bindBooksUI(
        (): void => {
            appContext.runtime.handleBooksChanged();
        },
        {
            onEstimatedFinishNavigate: (dateKey) => {
                activateTab("schedule", { focusPanel: true });
                focusCalendarDate(dateKey);
            },
        },
    );
    setBookCommitHook((nextBooks) => {
        applyAppStateMutation(appContext.state, {
            books: nextBooks,
            type: "set_book_index",
        });
    });
    bindHelpDialog();
    const planController = buildPlanController(appContext);
    appContext.runtime.setPlanController(planController);
    bindExperienceSettings((): void => {
        appContext.dashboards.applyExperienceSettings();
    });
    configureCalendarAppInteractions(appContext);
    await loadStateAndBindTodayActions(appContext, planController);
}
