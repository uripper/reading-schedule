import type {
    AppBootstrapContext,
    CalendarHandlers,
    PlannerResult,
} from "../../../types/types.ts";
import {
    bindBooksUI,
    collectAllBooks,
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
import { bindHelpDialog } from "../../help.ts";
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
import { refreshForLocalDayRollover } from "../today/today-rollover-refresh.ts";
import { loadStateAndBindTodayActions } from "./init-app-load.ts";
import { setupSkipLink } from "./init-helpers.ts";
import { buildPlanController } from "./init-plan-controller.ts";

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
    planController: ReturnType<typeof buildPlanController>,
): void {
    configureTodayInteractions({
        listSessionBooks: calendarHandlers.listSessionBooks,
        onManualSessionAdded: calendarHandlers.onManualSessionAdded,
        onReplanToday: planController.replanToday,
        onSessionCompletionChanged: calendarHandlers.onSessionCompletionChanged,
        onSessionMinutesUpdated: calendarHandlers.onSessionMinutesUpdated,
        onSessionProgressUpdated: calendarHandlers.onSessionProgressUpdated,
        onSessionRemoved: calendarHandlers.onSessionRemoved,
        rerender: (): void => {
            context.dashboards.updateDashboards();
        },
        setStatus: context.setStatus,
    });
}

function bindDayRollover(context: AppBootstrapContext): void {
    bindTodayDayRollover({
        onDayChanged: (): void => {
            refreshForLocalDayRollover({
                queueAutoPlan: context.runtime.queueAutoPlanIfReady.bind(
                    context.runtime,
                ),
                renderCurrentSchedule: (): void => {
                    renderCalendar(
                        context.state.lastResult?.schedule ?? [],
                        totalsFromSummary(
                            context.state.lastResult?.summary ?? null,
                        ),
                    );
                },
                resetTodayUi: resetTodayCarouselUiState,
                updateDashboards: context.dashboards.updateDashboards.bind(
                    context.dashboards,
                ),
            });
        },
    });
}

/**
 * Wires calendar interaction handlers against app runtime callbacks/state.
 * @param appContext - Shared bootstrap context.
 */
function configureCalendarAppInteractions(
    appContext: AppBootstrapContext,
): CalendarHandlers {
    return configureAppCalendarInteractions(
        buildCalendarInteractionArgs({
            appContext,
            handleScheduleMutation: (): void => {
                appContext.runtime.handleScheduleMutation();
            },
            runtimeState: appContext.state,
            setLastResult: (nextResult: PlannerResult): void => {
                applyAppStateMutation(appContext.state, {
                    lastResult: nextResult,
                    type: "set_last_result",
                });
            },
            updateDashboards: (): void => {
                appContext.dashboards.updateDashboards();
            },
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
        setStatus: options.appContext.setStatus,
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
    bindHelpDialog({
        beforeImport: context.prepareForDataImport,
    });
    const PLAN_CONTROLLER = buildPlanController(context);
    context.runtime.setPlanController(PLAN_CONTROLLER);
    bindExperienceSettings((): void => {
        context.dashboards.applyExperienceSettings();
    });
    const CALENDAR_HANDLERS = configureCalendarAppInteractions(context);
    configureTodayUi(context, CALENDAR_HANDLERS, PLAN_CONTROLLER);
    await loadStateAndBindTodayActions(context, PLAN_CONTROLLER);
    bindDayRollover(context);
}
