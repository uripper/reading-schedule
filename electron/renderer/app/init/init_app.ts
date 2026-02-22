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
  renderCalendar,
} from "../../calendar.js";
import { bindDesktopShortcuts } from "../../shortcuts/index.js";
import { addLog, bindHelpDialog } from "../../help.js";
import { collectSettings, initSettingsGrid } from "../../settings.js";
import { bindTabs } from "../../tabs.js";
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
 *
 * @param context
 */
export async function initApp(context: AppBootstrapContext): Promise<void> {
  setupSkipLink();
  bindDesktopShortcuts({
    plannerApi: context.plannerApi,
    announce: context.announce,
  });
  initSettingsGrid();
  bindTabs(context.runtime.handleTabChange);
  bindBooksUI(context.runtime.handleBooksChanged);
  bindHelpDialog();
  const planController = createAppPlanControllerInstance({
    collectBooks,
    collectSettings,
    setStatus: context.setStatus,
    addLog,
    renderCalendar,
    totalsFromSummary,
    setBookScheduleRows,
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
    setScheduleCompletions: (nextCompletions: Record<string, boolean>) => {
      context.state.scheduleCompletions = nextCompletions;
    },
  });
  context.runtime.setPlanController(planController);
  bindExperienceSettings(context.dashboards.applyExperienceSettings);
  configureAppCalendarInteractions({
    configureCalendarInteractions,
    state: context.state,
    queuePersist: context.queuePersist,
    setStatus: context.setStatus,
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
