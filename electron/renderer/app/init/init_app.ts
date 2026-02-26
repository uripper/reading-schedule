import {
  bindBooksUI,
  collectAllBooks,
  collectBooks,
  getBookById,
  setBookScheduleRows,
  updateBookProgress,
} from "../../books.js";
import {
  configureCalendarInteractions,
  focusCalendarDate,
  renderCalendar,
} from "../../calendar.js";
import { bindDesktopShortcuts } from "../../shortcuts/index.js";
import { addLog, bindHelpDialog } from "../../help.js";
import { collectSettings, initSettingsGrid } from "../../settings.js";
import { activateTab, bindTabs } from "../../tabs.js";
import { configureAppCalendarInteractions } from "../calendar_interactions/index.js";
import { bindExperienceSettings } from "../experience/index.js";
import {
  createAppPlanControllerInstance,
  setupSkipLink,
} from "./init_helpers.js";
import { loadStateAndBindTodayActions } from "./init_app_load.js";
import { totalsFromSummary } from "../runtime_helpers.js";
import type { AppBootstrapContext } from "../bootstrap_runtime.js";
import type { PlannerResult } from "../../../types/types.js";

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
    collectBooks,
    collectSettings,
    addLog,
    renderCalendar,
    totalsFromSummary,
    setBookScheduleRows,
    setStatus: (message: string, isError?: boolean): void => {
      appContext.setStatus(message, isError);
    },
    persistDraft: async (): Promise<boolean> => await appContext.persistDraft(),
    plannerApi: appContext.plannerApi,
    updateTodayView: (): void => {
      appContext.dashboards.updateDashboards();
    },
    announce: (message: string, politeness?: "polite" | "assertive"): void => {
      appContext.announceForPlanController(message, politeness);
    },
    getLastResult: (): PlannerResult | null => runtimeState.lastResult,
    setLastResult: (nextResult: PlannerResult) => {
      runtimeState.lastResult = nextResult;
    },
    getSessions: (): typeof runtimeState.sessions => runtimeState.sessions,
    getScheduleCompletions: (): Record<string, boolean> =>
      runtimeState.scheduleCompletions,
    getBlockedDayBooks: (): Record<string, boolean> =>
      runtimeState.blockedDayBooks,
    setScheduleCompletions: (nextCompletions: Record<string, boolean>) => {
      runtimeState.scheduleCompletions = nextCompletions;
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
    configureCalendarInteractions,
    collectSettings,
    collectAllBooks,
    setBookScheduleRows,
    renderCalendar,
    totalsFromSummary,
    updateBookProgress,
    getBookById,
    state: runtimeState,
    queuePersist: (): void => {
      appContext.queuePersist();
    },
    setStatus: (message: string, isError?: boolean): void => {
      appContext.setStatus(message, isError);
    },
    setLastResult: (nextResult: PlannerResult) => {
      runtimeState.lastResult = nextResult;
    },
    onSessionCompletionUpdated: (): void => {
      appContext.runtime.handleScheduleMutation();
    },
    onProgressUpdated: (): void => {
      appContext.runtime.handleScheduleMutation();
    },
    onScheduleRowsUpdated: (): void => {
      appContext.dashboards.updateDashboards();
    },
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
    plannerApi: appContext.plannerApi,
    announce: appContext.announce,
  });
  initSettingsGrid();
  bindTabs((name: string): void => {
    appContext.runtime.handleTabChange(name);
  });
  bindBooksUI((): void => {
    appContext.runtime.handleBooksChanged();
  }, {
    onEstimatedFinishNavigate: (dateKey) => {
      activateTab("schedule", { focusPanel: true });
      focusCalendarDate(dateKey);
    },
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
