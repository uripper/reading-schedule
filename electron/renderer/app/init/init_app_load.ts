import { applyPreferencesToDocument } from "../../accessibility/index.js";
import { fillBooks } from "../../books.js";
import { fillSettings } from "../../settings.js";
import {
  normalizeFeatureFlags,
  normalizePreferences,
  fillPreferencesUI,
  normalizeScheduleCompletions,
} from "../experience/index.js";
import { bindTodayActions, finalizeInitialLoad } from "./init_helpers.js";
import { loadInitialData } from "../load_state.js";
import { applyAppStateMutation } from "../state_mutations.js";
import type {
  AppBootstrapContext,
  LoadedResultController,
} from "../../../types/types.js";
import type {
  CreateLoadStateArgsInput,
  LoadStateArgs,
  SetStatus,
} from "../../../types/types_app.js";

/**
 * Creates `loadInitialData` bindings for runtime state mutation and startup flow.
 * @param args Bound startup/load dependencies.
 * @returns Fully bound load-state arguments.
 */
function createLoadStateArgs(
  args: CreateLoadStateArgsInput,
): LoadStateArgs {
  const runtimeState = args.state;
  return {
    fillSettings,
    fillBooks,
    normalizePreferences,
    normalizeFeatureFlags,
    normalizeScheduleCompletions,
    fillPreferencesUI,
    applyPreferencesToDocument,
    setStatus: args.setStatus,
    addLog: (message) => {
      args.context.addLog(message);
    },
    plannerApi: args.context.plannerApi,
    updateTodayView: () => {
      args.updateTodayView();
    },
    setPreferences: (preferences) => {
      runtimeState.preferences = preferences;
    },
    setFeatureFlags: (featureFlags) => {
      runtimeState.featureFlags = featureFlags;
    },
    setScheduleCompletions: (scheduleCompletions) => {
      applyAppStateMutation(runtimeState, {
        type: "set_schedule_completions",
        scheduleCompletions,
      });
    },
    setBlockedDayBooks: (blockedDayBooks) => {
      applyAppStateMutation(runtimeState, {
        type: "set_blocked_day_books",
        blockedDayBooks,
      });
    },
    setSessions: (sessions) => {
      applyAppStateMutation(runtimeState, { type: "set_sessions", sessions });
    },
    applyLoadedResult: (result) => {
      if (result) {
        args.planController.applyLoadedResult(result);
      } else {
        applyAppStateMutation(runtimeState, {
          type: "set_last_result",
          lastResult: null,
        });
      }
    },
    onLoaded: (saved, loadResult) => {
      finalizeInitialLoad({
        saved,
        loadResult,
        addLog: (message) => {
          args.context.addLog(message);
        },
        queuePersist: () => {
          args.queuePersist();
        },
        setStatus: args.setStatus,
        setReady: () => {
          runtimeState.ready = true;
        },
        queueAutoPlan: () => {
          args.queueAutoPlanIfReady();
        },
      });
    },
  };
}

/**
 * Binds Today action handlers backed by central state mutation operations.
 * @param state Mutable runtime state.
 * @param handleScheduleMutation Dashboard refresh callback.
 * @param queuePersist Persist queue callback.
 * @param setStatus Status output callback.
 */
function bindTodayActionsWithState(
  state: AppBootstrapContext["state"],
  handleScheduleMutation: () => void,
  queuePersist: () => void,
  setStatus: SetStatus,
): void {
  bindTodayActions({
    getLastResult: () => state.lastResult,
    getScheduleCompletions: () => state.scheduleCompletions,
    setScheduleCompletions: (nextCompletions) => {
      applyAppStateMutation(state, {
        type: "set_schedule_completions",
        scheduleCompletions: nextCompletions,
      });
    },
    getSessions: () => state.sessions,
    setSessions: (nextSessions) => {
      applyAppStateMutation(state, {
        type: "set_sessions",
        sessions: nextSessions,
      });
    },
    updateTodayView: handleScheduleMutation,
    queuePersist,
    setStatus,
  });
}

/**
 * Loads the initial state of the application, applying it to the provided context and controller,
 * and binds actions for the "Today" view.
 * @param context Application bootstrap context containing APIs and state management functions
 * @param planController Controller for applying the loaded planner result to the application state
 * @returns Promise that resolves when the initial load and bindings are complete
 */
export async function loadStateAndBindTodayActions(
  context: AppBootstrapContext,
  planController: LoadedResultController,
): Promise<void> {
  const { state } = context;
  const updateDashboards = context.dashboards.updateDashboards.bind(
    context.dashboards,
  );
  const setStatus = context.setStatus.bind(context);
  const queuePersist = context.queuePersist.bind(context);
  const queueAutoPlanIfReady = context.runtime.queueAutoPlanIfReady.bind(
    context.runtime,
  );
  const handleScheduleMutation = context.runtime.handleScheduleMutation.bind(
    context.runtime,
  );

  await loadInitialData(
    createLoadStateArgs(
      {
        context,
        state,
        planController,
        setStatus,
        queuePersist,
        queueAutoPlanIfReady,
        updateTodayView: updateDashboards,
      },
    ),
  );
  bindTodayActionsWithState(state, handleScheduleMutation, queuePersist, setStatus);
}
