import type {
    AppBootstrapContext,
    CreateLoadStateArgsInput,
    LoadedResultController,
    LoadStateArgs,
} from "../../../types/types.ts";
import { applyPreferencesToDocument } from "../../accessibility/index.ts";
import { fillBooks } from "../../books.ts";
import { fillSettings } from "../../settings.ts";
import {
    fillPreferencesUI,
    normalizeFeatureFlags,
    normalizePreferences,
    normalizeScheduleCompletions,
} from "../experience/index.ts";
import { loadInitialData } from "../load_state.ts";
import { applyAppStateMutation } from "../state_mutations.ts";
import { finalizeInitialLoad } from "./init_helpers.ts";

/**
 * Creates `loadInitialData` bindings for runtime state mutation and startup flow.
 * @param args - Bound startup/load dependencies.
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
 * Loads the initial state of the application and applies it to runtime context.
 * @param context - Application bootstrap context containing APIs and state management functions
 * @param planController - Controller for applying the loaded planner result to the application state
 * @returns Promise that resolves when initial load is complete
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
}
