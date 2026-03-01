import {
    type AppBootstrapContext,
    type CreateLoadStateArgsInput,
    type LoadedResultController,
    type LoadStateArgs,
    type SetStatus,
} from "../../../types/types.js";
import { applyPreferencesToDocument } from "../../accessibility/index.js";
import { fillBooks } from "../../books.js";
import { fillSettings } from "../../settings.js";
import {
    fillPreferencesUI,
    normalizeFeatureFlags,
    normalizePreferences,
    normalizeScheduleCompletions,
} from "../experience/index.js";
import { loadInitialData } from "../load_state.js";
import { applyAppStateMutation } from "../state_mutations.js";
import { bindTodayActions, finalizeInitialLoad } from "./init_helpers.js";

/**
 * Creates `loadInitialData` bindings for runtime state mutation and startup flow.
 * @param args Bound startup/load dependencies.
 * @returns Fully bound load-state arguments.
 */
function createLoadStateArgs(args: CreateLoadStateArgsInput): LoadStateArgs {
    const RUNTIME_STATE = args.state;
    return {
        addLog: (message) => {
            args.context.addLog(message);
        },
        applyLoadedResult: (result) => {
            if (result) {
                args.planController.applyLoadedResult(result);
            } else {
                applyAppStateMutation(RUNTIME_STATE, {
                    lastResult: null,
                    type: "set_last_result",
                });
            }
        },
        applyPreferencesToDocument,
        fillBooks,
        fillPreferencesUI,
        fillSettings,
        normalizeFeatureFlags,
        normalizePreferences,
        normalizeScheduleCompletions,
        onLoaded: (saved, loadResult) => {
            finalizeInitialLoad({
                addLog: (message) => {
                    args.context.addLog(message);
                },
                loadResult,
                queueAutoPlan: () => {
                    args.queueAutoPlanIfReady();
                },
                queuePersist: () => {
                    args.queuePersist();
                },
                saved,
                setReady: () => {
                    RUNTIME_STATE.ready = true;
                },
                setStatus: args.setStatus,
            });
        },
        plannerApi: args.context.plannerApi,
        setBlockedDayBooks: (blockedDayBooks) => {
            applyAppStateMutation(RUNTIME_STATE, {
                blockedDayBooks,
                type: "set_blocked_day_books",
            });
        },
        setFeatureFlags: (featureFlags) => {
            RUNTIME_STATE.featureFlags = featureFlags;
        },
        setPreferences: (preferences) => {
            RUNTIME_STATE.preferences = preferences;
        },
        setScheduleCompletions: (scheduleCompletions) => {
            applyAppStateMutation(RUNTIME_STATE, {
                scheduleCompletions,
                type: "set_schedule_completions",
            });
        },
        setSessions: (sessions) => {
            applyAppStateMutation(RUNTIME_STATE, {
                sessions,
                type: "set_sessions",
            });
        },
        setStatus: args.setStatus,
        updateTodayView: () => {
            args.updateTodayView();
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
        getSessions: () => state.sessions,
        queuePersist,
        setScheduleCompletions: (nextCompletions) => {
            applyAppStateMutation(state, {
                scheduleCompletions: nextCompletions,
                type: "set_schedule_completions",
            });
        },
        setSessions: (nextSessions) => {
            applyAppStateMutation(state, {
                sessions: nextSessions,
                type: "set_sessions",
            });
        },
        setStatus,
        updateTodayView: handleScheduleMutation,
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
    const UPDATE_DASHBOARDS = context.dashboards.updateDashboards.bind(
        context.dashboards,
    );
    const SET_STATUS = context.setStatus.bind(context);
    const QUEUE_PERSIST = context.queuePersist.bind(context);
    const QUEUE_AUTO_PLAN_IF_READY = context.runtime.queueAutoPlanIfReady.bind(
        context.runtime,
    );
    const HANDLE_SCHEDULE_MUTATION =
        context.runtime.handleScheduleMutation.bind(context.runtime);

    await loadInitialData(
        createLoadStateArgs({
            context,
            planController,
            queueAutoPlanIfReady: QUEUE_AUTO_PLAN_IF_READY,
            queuePersist: QUEUE_PERSIST,
            setStatus: SET_STATUS,
            state,
            updateTodayView: UPDATE_DASHBOARDS,
        }),
    );
    bindTodayActionsWithState(
        state,
        HANDLE_SCHEDULE_MUTATION,
        QUEUE_PERSIST,
        SET_STATUS,
    );
}
