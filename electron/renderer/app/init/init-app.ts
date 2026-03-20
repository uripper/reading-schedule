import type {
    AppBootstrapContext,
    CalendarHandlers,
    PlannerResult,
} from "../../../types/types.ts";
import {
    bindBooksUI,
    collectAllBooks,
    collectBooks,
    getBookById,
    setBookCommitHook,
    setBookScheduleRows,
    updateBookProgress,
} from "../../books/controller.ts";
import {
    configureCalendarInteractions,
    focusCalendarDate,
    renderCalendar,
} from "../../calendar.ts";
import { addLog, bindHelpDialog } from "../../help.ts";
import { collectSettings, initSettingsGrid } from "../../settings.ts";
import { bindDesktopShortcuts } from "../../shortcuts/desktop_shortcuts.ts";
import { activateTab, bindTabs } from "../../tabs.ts";
import { configureAppCalendarInteractions } from "../calendar_interactions/calendar-interactions.ts";
import { bindExperienceSettings } from "../experience/bindings.ts";
import { totalsFromSummary } from "../runtime_helpers.ts";
import { applyAppStateMutation } from "../state_mutations.ts";
import { configureTodayInteractions } from "../today/today_carousel_render.ts";
import { resetTodayCarouselUiState } from "../today/today_carousel_state.ts";
import { bindTodayDayRollover } from "../today/today_rollover.ts";
import { loadStateAndBindTodayActions } from "./init-app-load.ts";
import {
    createAppPlanControllerInstance,
    setupSkipLink,
} from "./init-helpers.ts";

function bindAppShortcuts(context: AppBootstrapContext): void {
    bindDesktopShortcuts({
        announce: context.announce,
        plannerApi: context.plannerApi,
    });
}

function bindRuntimeTabs(context: AppBootstrapContext): void {
    bindTabs((name: string): void => {
        context.runtime.handleTabChange(name);
    });
}

function bindBooksRuntime(context: AppBootstrapContext): void {
    bindBooksUI(
        (): void => {
            context.runtime.handleBooksChanged();
        },
        {
            onEstimatedFinishNavigate: (dateKey) => {
                activateTab("schedule", { focusPanel: true });
                focusCalendarDate(dateKey);
            },
        },
    );
    setBookCommitHook((nextBooks) => {
        applyAppStateMutation(context.state, {
            books: nextBooks,
            type: "set_book_index",
        });
    });
}

function configureTodayUi(
    context: AppBootstrapContext,
    calendarHandlers: CalendarHandlers,
): void {
    configureTodayInteractions({
        onSessionCompletionChanged: calendarHandlers.onSessionCompletionChanged,
        onSessionMinutesUpdated: calendarHandlers.onSessionMinutesUpdated,
        onSessionProgressUpdated: calendarHandlers.onSessionProgressUpdated,
        onSessionRemoved: calendarHandlers.onSessionRemoved,
        rerender: (): void => {
            context.dashboards.updateDashboards();
        },
        setStatus: (message: string, isError = false): void => {
            context.setStatus(message, isError);
        },
    });
}

function bindDayRollover(context: AppBootstrapContext): void {
    bindTodayDayRollover({
        onDayChanged: (): void => {
            resetTodayCarouselUiState();
            renderCalendar(
                context.state.lastResult?.schedule ?? [],
                totalsFromSummary(context.state.lastResult?.summary ?? null),
            );
            context.dashboards.updateDashboards();
        },
    });
}

/**
 * Creates the app-level plan controller instance with runtime-bound callbacks.
 * @param appContext - Shared bootstrap context.
 * @returns Plan controller instance.
 */
function buildPlanController(
    appContext: AppBootstrapContext,
): ReturnType<typeof createAppPlanControllerInstance> {
    return createAppPlanControllerInstance(
        buildPlanControllerArgs({
            appContext,
            ...createPlanControllerStateBindings(appContext),
        }),
    );
}

function createPlanControllerStateBindings(appContext: AppBootstrapContext): {
    runtimeState: AppBootstrapContext["state"];
    setLastResult: (nextResult: PlannerResult) => void;
    setScheduleCompletions: (nextCompletions: Record<string, boolean>) => void;
    updateTodayView: () => void;
} {
    const RUNTIME_STATE = appContext.state;

    return {
        runtimeState: RUNTIME_STATE,
        setLastResult: (nextResult: PlannerResult): void => {
            applyAppStateMutation(RUNTIME_STATE, {
                lastResult: nextResult,
                type: "set_last_result",
            });
        },
        setScheduleCompletions: (
            nextCompletions: Record<string, boolean>,
        ): void => {
            applyAppStateMutation(RUNTIME_STATE, {
                scheduleCompletions: nextCompletions,
                type: "set_schedule_completions",
            });
        },
        updateTodayView: (): void => {
            appContext.dashboards.updateDashboards();
        },
    };
}

function createPlanControllerSelectors(
    runtimeState: AppBootstrapContext["state"],
) {
    return {
        getBlockedDayBooks: (): Record<string, boolean> =>
            runtimeState.blockedDayBooks,
        getLastResult: (): PlannerResult | null => runtimeState.lastResult,
        getScheduleCompletions: (): Record<string, boolean> =>
            runtimeState.scheduleCompletions,
        getSessions: (): AppBootstrapContext["state"]["sessions"] =>
            runtimeState.sessions,
    };
}

function createPlanControllerActions(
    appContext: AppBootstrapContext,
    options: Pick<
        ReturnType<typeof createPlanControllerStateBindings>,
        "setLastResult" | "setScheduleCompletions" | "updateTodayView"
    >,
) {
    return {
        announce: (
            message: string,
            politeness?: "polite" | "assertive",
        ): void => {
            appContext.announceForPlanController(message, politeness);
        },
        persistDraft: async (): Promise<boolean> =>
            await appContext.persistDraft(),
        plannerApi: appContext.plannerApi,
        setLastResult: options.setLastResult,
        setScheduleCompletions: options.setScheduleCompletions,
        setStatus: (message: string, isError = false): void => {
            appContext.setStatus(message, isError);
        },
        updateTodayView: options.updateTodayView,
    };
}

function buildPlanControllerArgs(options: {
    appContext: AppBootstrapContext;
    runtimeState: AppBootstrapContext["state"];
    setLastResult: (nextResult: PlannerResult) => void;
    setScheduleCompletions: (nextCompletions: Record<string, boolean>) => void;
    updateTodayView: () => void;
}): Parameters<typeof createAppPlanControllerInstance>[0] {
    return {
        addLog,
        collectBooks,
        collectSettings,
        renderCalendar,
        setBookScheduleRows,
        totalsFromSummary,
        ...createPlanControllerSelectors(options.runtimeState),
        ...createPlanControllerActions(options.appContext, options),
    };
}

/**
 * Wires calendar interaction handlers against app runtime callbacks/state.
 * @param appContext - Shared bootstrap context.
 */
function configureCalendarAppInteractions(
    appContext: AppBootstrapContext,
): CalendarHandlers {
    const RUNTIME_STATE = appContext.state;

    function handleScheduleMutation(): void {
        appContext.runtime.handleScheduleMutation();
    }

    function updateDashboards(): void {
        appContext.dashboards.updateDashboards();
    }

    function setLastResult(nextResult: PlannerResult): void {
        applyAppStateMutation(RUNTIME_STATE, {
            lastResult: nextResult,
            type: "set_last_result",
        });
    }

    return configureAppCalendarInteractions(
        buildCalendarInteractionArgs({
            appContext,
            handleScheduleMutation,
            runtimeState: RUNTIME_STATE,
            setLastResult,
            updateDashboards,
        }),
    );
}

function buildCalendarInteractionArgs(options: {
    appContext: AppBootstrapContext;
    handleScheduleMutation: () => void;
    runtimeState: AppBootstrapContext["state"];
    setLastResult: (nextResult: PlannerResult) => void;
    updateDashboards: () => void;
}): Parameters<typeof configureAppCalendarInteractions>[0] {
    return {
        applyStateMutation: (mutation) => {
            applyAppStateMutation(options.runtimeState, mutation);
        },
        collectAllBooks,
        collectSettings,
        configureCalendarInteractions,
        getBookById,
        onProgressUpdated: options.handleScheduleMutation,
        onScheduleRowsUpdated: options.updateDashboards,
        onSessionCompletionUpdated: options.handleScheduleMutation,
        queuePersist: (): void => {
            options.appContext.queuePersist();
        },
        renderCalendar,
        setBookScheduleRows,
        setLastResult: options.setLastResult,
        setStatus: (message: string, isError = false): void => {
            options.appContext.setStatus(message, isError);
        },
        state: options.runtimeState,
        totalsFromSummary,
        updateBookProgress,
    };
}

/**
 * Initializes renderer app bindings, controllers, and startup data load.
 * @param context - Bootstrap context containing APIs, state, and runtime hooks.
 * @returns Promise that resolves after startup load/bind operations complete.
 */
export async function initApp(context: AppBootstrapContext): Promise<void> {
    setupSkipLink();
    bindAppShortcuts(context);
    initSettingsGrid();
    bindRuntimeTabs(context);
    bindBooksRuntime(context);
    bindHelpDialog();
    const PLAN_CONTROLLER = buildPlanController(context);
    context.runtime.setPlanController(PLAN_CONTROLLER);
    bindExperienceSettings((): void => {
        context.dashboards.applyExperienceSettings();
    });
    const CALENDAR_HANDLERS = configureCalendarAppInteractions(context);
    configureTodayUi(context, CALENDAR_HANDLERS);
    await loadStateAndBindTodayActions(context, PLAN_CONTROLLER);
    bindDayRollover(context);
}
