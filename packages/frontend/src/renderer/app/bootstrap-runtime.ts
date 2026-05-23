import type {
    AnnouncePoliteness,
    AppBootstrapContext,
    PlannerApi,
} from "../../types/types.ts";
import {
    applyPreferencesToDocument,
    createAnnouncer,
} from "../accessibility/a11y.ts";
import { collectAllBooks } from "../books/controller.ts";
import { focusCalendarToday } from "../calendar.ts";
import { el } from "../dom.ts";
import { addLog } from "../help.ts";
import { collectSettings } from "../settings.ts";
import { updateStatsView } from "../stats.ts";
import { createDashboardRuntime } from "./dashboard_runtime.ts";
import {
    normalizeFeatureFlags,
    normalizePreferences,
} from "./experience/model.ts";
import {
    collectFeatureFlagsFromUI as collectFeatureFlagsFromUi,
    collectPreferencesFromUI as collectPreferencesFromUi,
} from "./experience/ui.ts";
import { createInitRuntime } from "./init/init_runtime.ts";
import { createPersistQueue } from "./persist-queue.ts";
import { createStatusSetter } from "./runtime_helpers.ts";
import { createRuntimeState } from "./runtime_state.ts";
import { updateTodayDashboard } from "./today/today.ts";

/**
 * Retrieves the Planner API from the global context after the desktop host installs it.
 * @returns The Planner API instance available on the global context.
 */
function plannerApiFromGlobal(): PlannerApi {
    const GLOBALS = globalThis as typeof globalThis & {
        plannerApi: PlannerApi;
    };
    return GLOBALS.plannerApi;
}

/**
 * Creates an announcer wrapper for plan controller with configurable politeness.
 */
function createPlanControllerAnnouncer(
    announce: (message: string, politeness?: AnnouncePoliteness) => void,
): (message: string, politeness?: AnnouncePoliteness) => void {
    return (message: string, politeness?: AnnouncePoliteness): void => {
        if (politeness === "polite" || politeness === "assertive") {
            announce(message, politeness);
            return;
        }
        announce(message);
    };
}

function createPersistActions(
    state: AppBootstrapContext["state"],
    plannerApi: PlannerApi,
): {
    persistDraft(): Promise<boolean>;
    prepareForDataImport(): Promise<void>;
    queuePersist(): void;
} {
    const PERSIST_QUEUE = createPersistQueue({
        addLog,
        collectBooks: collectAllBooks,
        collectSettings,
        getSessions: () => state.sessions,
        plannerApi,
        state,
    });

    return {
        persistDraft: async (): Promise<boolean> =>
            await PERSIST_QUEUE.persistDraft(),
        prepareForDataImport: async (): Promise<void> => {
            await PERSIST_QUEUE.prepareForStateImport();
        },
        queuePersist: (): void => {
            PERSIST_QUEUE.queuePersist();
        },
    };
}

type DashboardRuntimeArgs = Parameters<typeof createDashboardRuntime>[0];

function baseDashboardArgs(
    queuePersist: () => void,
    state: AppBootstrapContext["state"],
): Omit<
    DashboardRuntimeArgs,
    "collectFeatureFlagsFromUI" | "collectPreferencesFromUI"
> {
    return {
        applyPreferencesToDocument,
        collectAllBooks,
        normalizeFeatureFlags,
        normalizePreferences,
        queuePersist,
        state,
        updateStatsView,
        updateTodayDashboard,
    };
}

function dashboardUiArgs(): Pick<
    DashboardRuntimeArgs,
    "collectFeatureFlagsFromUI" | "collectPreferencesFromUI"
> {
    return {
        collectFeatureFlagsFromUI: collectFeatureFlagsFromUi,
        collectPreferencesFromUI: collectPreferencesFromUi,
    };
}

function createDashboards(
    queuePersist: () => void,
    state: AppBootstrapContext["state"],
) {
    return createDashboardRuntime({
        ...baseDashboardArgs(queuePersist, state),
        ...dashboardUiArgs(),
    });
}

function createRuntime(
    dashboards: ReturnType<typeof createDashboardRuntime>,
    queuePersist: () => void,
    state: AppBootstrapContext["state"],
) {
    return createInitRuntime({
        focusCalendarToday,
        queuePersist,
        state,
        updateDashboards: (): void => {
            dashboards.updateDashboards();
        },
    });
}

function buildBootstrapContext(options: {
    announce: (message: string, politeness?: AnnouncePoliteness) => void;
    announceForPlanController: (
        message: string,
        politeness?: AnnouncePoliteness,
    ) => void;
    dashboards: ReturnType<typeof createDashboardRuntime>;
    persistActions: ReturnType<typeof createPersistActions>;
    plannerApi: PlannerApi;
    runtime: ReturnType<typeof createInitRuntime>;
    setStatus: ReturnType<typeof createStatusSetter>;
    state: AppBootstrapContext["state"];
}): AppBootstrapContext {
    return {
        addLog,
        announce: options.announce,
        announceForPlanController: options.announceForPlanController,
        dashboards: options.dashboards,
        persistDraft: options.persistActions.persistDraft,
        plannerApi: options.plannerApi,
        prepareForDataImport: options.persistActions.prepareForDataImport,
        queuePersist: options.persistActions.queuePersist,
        runtime: options.runtime,
        setStatus: options.setStatus,
        state: options.state,
    };
}

function createBootstrapDependencies(state: AppBootstrapContext["state"]) {
    const PLANNER_API = plannerApiFromGlobal();
    const PERSIST_ACTIONS = createPersistActions(state, PLANNER_API);
    const DASHBOARDS = createDashboards(PERSIST_ACTIONS.queuePersist, state);

    return {
        dashboards: DASHBOARDS,
        persistActions: PERSIST_ACTIONS,
        plannerApi: PLANNER_API,
        runtime: createRuntime(DASHBOARDS, PERSIST_ACTIONS.queuePersist, state),
    };
}

/**
 * Creates and initializes the application bootstrap context, which includes state management, API access,
 * and utility functions for the application. This context is used throughout the application to manage state,
 * interact with the Planner API, and perform various actions related to the application's functionality.
 * @returns An initialized AppBootstrapContext object containing APIs, state, and utility functions
 */
export function createAppBootstrapContext(): AppBootstrapContext {
    const STATE = createRuntimeState();
    const ANNOUNCE = createAnnouncer();
    const ANNOUNCE_FOR_PLAN_CONTROLLER =
        createPlanControllerAnnouncer(ANNOUNCE);
    const SET_STATUS = createStatusSetter(el("status"), addLog);
    const DEPENDENCIES = createBootstrapDependencies(STATE);

    return buildBootstrapContext({
        announce: ANNOUNCE,
        announceForPlanController: ANNOUNCE_FOR_PLAN_CONTROLLER,
        dashboards: DEPENDENCIES.dashboards,
        persistActions: DEPENDENCIES.persistActions,
        plannerApi: DEPENDENCIES.plannerApi,
        runtime: DEPENDENCIES.runtime,
        setStatus: SET_STATUS,
        state: STATE,
    });
}
