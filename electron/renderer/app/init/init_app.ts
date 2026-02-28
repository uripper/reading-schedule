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
    const RUNTIME_STATE = appContext.state;
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
            RUNTIME_STATE.blockedDayBooks,
        getLastResult: (): PlannerResult | null => RUNTIME_STATE.lastResult,
        getScheduleCompletions: (): Record<string, boolean> =>
            RUNTIME_STATE.scheduleCompletions,
        getSessions: (): typeof RUNTIME_STATE.sessions =>
            RUNTIME_STATE.sessions,
        persistDraft: async (): Promise<boolean> =>
            await appContext.persistDraft(),
        plannerApi: appContext.plannerApi,
        renderCalendar,
        setBookScheduleRows,
        setLastResult: (nextResult: PlannerResult) => {
            applyAppStateMutation(RUNTIME_STATE, {
                lastResult: nextResult,
                type: "set_last_result",
            });
        },
        setScheduleCompletions: (nextCompletions: Record<string, boolean>) => {
            applyAppStateMutation(RUNTIME_STATE, {
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
    const RUNTIME_STATE = appContext.state;
    configureAppCalendarInteractions({
        applyStateMutation: (mutation) => {
            applyAppStateMutation(RUNTIME_STATE, mutation);
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
            applyAppStateMutation(RUNTIME_STATE, {
                lastResult: nextResult,
                type: "set_last_result",
            });
        },
        setStatus: (message: string, isError?: boolean): void => {
            appContext.setStatus(message, isError);
        },
        state: RUNTIME_STATE,
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
    const APP_CONTEXT = context;
    setupSkipLink();
    bindDesktopShortcuts({
        announce: APP_CONTEXT.announce,
        plannerApi: APP_CONTEXT.plannerApi,
    });
    initSettingsGrid();
    bindTabs((name: string): void => {
        APP_CONTEXT.runtime.handleTabChange(name);
    });
    bindBooksUI(
        (): void => {
            APP_CONTEXT.runtime.handleBooksChanged();
        },
        {
            onEstimatedFinishNavigate: (dateKey) => {
                activateTab("schedule", { focusPanel: true });
                focusCalendarDate(dateKey);
            },
        },
    );
    setBookCommitHook((nextBooks) => {
        applyAppStateMutation(APP_CONTEXT.state, {
            books: nextBooks,
            type: "set_book_index",
        });
    });
    bindHelpDialog();
    const PLAN_CONTROLLER = buildPlanController(APP_CONTEXT);
    APP_CONTEXT.runtime.setPlanController(PLAN_CONTROLLER);
    bindExperienceSettings((): void => {
        APP_CONTEXT.dashboards.applyExperienceSettings();
    });
    configureCalendarAppInteractions(APP_CONTEXT);
    await loadStateAndBindTodayActions(APP_CONTEXT, PLAN_CONTROLLER);
}
