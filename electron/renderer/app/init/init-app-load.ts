import type {
    AppBootstrapContext,
    CreateLoadStateArgsInput,
    FinalizeInitialLoadArgs,
    LoadedResultController,
    LoadStateArgs,
    PlannerResult,
} from "../../../types/types.ts";
import { applyPreferencesToDocument } from "../../accessibility/a11y.ts";
import { fillBooks } from "../../books.ts";
import { fillSettings } from "../../settings.ts";
import {
    fillPreferencesUI as fillPreferencesUi,
    normalizeFeatureFlags,
    normalizePreferences,
    normalizeScheduleCompletions,
} from "../experience/index.ts";
import { loadInitialData } from "../load_state.ts";
import { applyAppStateMutation } from "../state_mutations.ts";
import { finalizeInitialLoad } from "./init-helpers.ts";

function applyLoadedResult(
    args: CreateLoadStateArgsInput,
    result: PlannerResult | null,
): void {
    if (result !== null) {
        args.planController.applyLoadedResult(result);
        return;
    }

    applyAppStateMutation(args.state, {
        lastResult: null,
        type: "set_last_result",
    });
}

function finalizeLoad(
    args: CreateLoadStateArgsInput,
    loadResult: FinalizeInitialLoadArgs["loadResult"],
    saved: FinalizeInitialLoadArgs["saved"],
): void {
    const STATE = args.state;

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
            STATE.ready = true;
        },
        setStatus: args.setStatus,
    });
}

function applyScheduleCompletions(
    args: CreateLoadStateArgsInput,
    scheduleCompletions: Record<string, boolean>,
): void {
    applyAppStateMutation(args.state, {
        scheduleCompletions,
        type: "set_schedule_completions",
    });
}

function applySessions(
    args: CreateLoadStateArgsInput,
    sessions: CreateLoadStateArgsInput["state"]["sessions"],
): void {
    applyAppStateMutation(args.state, {
        sessions,
        type: "set_sessions",
    });
}

function createRuntimeLoadStateArgs(
    args: CreateLoadStateArgsInput,
): Omit<
    LoadStateArgs,
    | "fillPreferencesUI"
    | "setBlockedDayBooks"
    | "setFeatureFlags"
    | "setPreferences"
    | "setScheduleCompletions"
    | "setSessions"
> {
    return {
        addLog: (message) => {
            args.context.addLog(message);
        },
        applyLoadedResult: (result) => {
            applyLoadedResult(args, result);
        },
        applyPreferencesToDocument,
        fillBooks,
        fillSettings,
        normalizeFeatureFlags,
        normalizePreferences,
        normalizeScheduleCompletions,
        onLoaded: (saved, loadResult) => {
            finalizeLoad(args, loadResult, saved);
        },
        plannerApi: args.context.plannerApi,
        setStatus: args.setStatus,
        updateTodayView: () => {
            args.updateTodayView();
        },
    };
}

function createStateLoadStateArgs(
    args: CreateLoadStateArgsInput,
): Pick<
    LoadStateArgs,
    | "setBlockedDayBooks"
    | "setFeatureFlags"
    | "setPreferences"
    | "setScheduleCompletions"
    | "setSessions"
> {
    const STATE = args.state;

    return {
        setBlockedDayBooks: (blockedDayBooks) => {
            applyAppStateMutation(STATE, {
                blockedDayBooks,
                type: "set_blocked_day_books",
            });
        },
        setFeatureFlags: (featureFlags) => {
            STATE.featureFlags = featureFlags;
        },
        setPreferences: (preferences) => {
            STATE.preferences = preferences;
        },
        setScheduleCompletions: (scheduleCompletions) => {
            applyScheduleCompletions(args, scheduleCompletions);
        },
        setSessions: (sessions) => {
            applySessions(args, sessions);
        },
    };
}

/**
 * Creates `loadInitialData` bindings for runtime state mutation and startup flow.
 * @param args - Bound startup/load dependencies.
 * @returns Fully bound load-state arguments.
 */
function createLoadStateArgs(args: CreateLoadStateArgsInput): LoadStateArgs {
    const LOAD_STATE_ARGS = {
        ...createRuntimeLoadStateArgs(args),
        ...createStateLoadStateArgs(args),
    } as LoadStateArgs;

    LOAD_STATE_ARGS["fillPreferencesUI"] = fillPreferencesUi;

    return LOAD_STATE_ARGS;
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
    await loadInitialData(
        createLoadStateArgs({
            context,
            planController,
            queueAutoPlanIfReady: context.runtime.queueAutoPlanIfReady.bind(
                context.runtime,
            ),
            queuePersist: context.queuePersist.bind(context),
            setStatus: context.setStatus.bind(context),
            state: context.state,
            updateTodayView: context.dashboards.updateDashboards.bind(
                context.dashboards,
            ),
        }),
    );
}
