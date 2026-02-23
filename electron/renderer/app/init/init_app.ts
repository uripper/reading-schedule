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
import type { PlannerResult } from "../types.js";

/**
 * Initializes renderer app bindings, controllers, and startup data load.
 * @param context Bootstrap context containing APIs, state, and runtime hooks.
 * @returns Promise that resolves after startup load/bind operations complete.
 */
export async function initApp(context: AppBootstrapContext): Promise<void> {
  setupSkipLink();
  bindDesktopShortcuts({
    plannerApi: context.plannerApi,
    announce: context.announce,
  });
  initSettingsGrid();
  bindTabs(context.runtime.handleTabChange);
  bindBooksUI(context.runtime.handleBooksChanged, {
    onEstimatedFinishNavigate: (dateKey) => {
      activateTab("schedule", { focusPanel: true });
      focusCalendarDate(dateKey);
    },
  });
  bindHelpDialog();
  const planController = createAppPlanControllerInstance({
    collectBooks,
    collectSettings,
    addLog,
    renderCalendar,
    totalsFromSummary,
    setBookScheduleRows,
    setStatus: context.setStatus,
    persistDraft: context.persistDraft,
    plannerApi: context.plannerApi,
    updateTodayView: context.dashboards.updateDashboards,
    announce: context.announceForPlanController,
    getLastResult: () => context.state.lastResult,
    setLastResult: (nextResult: PlannerResult) => {
      context.state.lastResult = nextResult;
    },
    getSessions: () => context.state.sessions,
    getScheduleCompletions: () => context.state.scheduleCompletions,
    getBlockedDayBooks: () => context.state.blockedDayBooks,
    setScheduleCompletions: (nextCompletions: Record<string, boolean>) => {
      context.state.scheduleCompletions = nextCompletions;
    },
  });
  context.runtime.setPlanController(planController);
  bindExperienceSettings(context.dashboards.applyExperienceSettings);
  configureAppCalendarInteractions({
    state: context.state,
    queuePersist: context.queuePersist,
    setStatus: context.setStatus,
    configureCalendarInteractions,
    collectSettings,
    collectAllBooks,
    setBookScheduleRows,
    renderCalendar,
    totalsFromSummary,
    updateBookProgress,
    getBookById,
    setLastResult: (nextResult: PlannerResult) => {
      context.state.lastResult = nextResult;
    },
    onSessionCompletionUpdated: context.runtime.handleScheduleMutation,
    onProgressUpdated: context.runtime.handleScheduleMutation,
    onScheduleRowsUpdated: context.dashboards.updateDashboards,
  });
  await loadStateAndBindTodayActions(context, planController);
}
