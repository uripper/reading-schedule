import type {
    AnnouncePoliteness,
    AppBootstrapContext,
    PlannerApi,
} from "../../types/types.ts";
import {
    applyPreferencesToDocument,
    createAnnouncer,
} from "../accessibility/index.ts";
import { collectAllBooks } from "../books.ts";
import { focusCalendarToday } from "../calendar.ts";
import { el } from "../dom.ts";
import { addLog } from "../help.ts";
import { collectSettings } from "../settings.ts";
import { updateStatsView } from "../stats.ts";
import { createDashboardRuntime } from "./dashboard_runtime.ts";
import {
    collectFeatureFlagsFromUI,
    collectPreferencesFromUI,
    normalizeFeatureFlags,
    normalizePreferences,
} from "./experience/index.ts";
import { createInitRuntime } from "./init/index.ts";
import { createPersistQueue, createStatusSetter } from "./runtime_helpers.ts";
import { createRuntimeState } from "./runtime_state.ts";
import { updateTodayDashboard } from "./today/index.ts";

/**
 * Retrieves the Planner API from the global context. This function assumes that the `plannerApi`
 * has been exposed on the global object, which is typically done in the preload script of an Electron
 * application.
 * @returns The Planner API instance available on the global context
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

/**
 * Creates and initializes the application bootstrap context, which includes state management, API access,
 * and utility functions for the application. This context is used throughout the application to manage state,
 * interact with the Planner API, and perform various actions related to the application's functionality.
 * @returns An initialized AppBootstrapContext object containing APIs, state, and utility functions
 */
export function createAppBootstrapContext(): AppBootstrapContext {
    const STATE = createRuntimeState();
    const PLANNER_API = plannerApiFromGlobal();
    const ANNOUNCE = createAnnouncer();
    const ANNOUNCE_FOR_PLAN_CONTROLLER =
        createPlanControllerAnnouncer(ANNOUNCE);
    const SET_STATUS = createStatusSetter(el("status"), addLog);
    const PERSIST_QUEUE = createPersistQueue({
        addLog,
        collectBooks: collectAllBooks,
        collectSettings,
        getSessions: () => STATE.sessions,
        plannerApi: PLANNER_API,
        state: STATE,
    });
    const QUEUE_PERSIST = (): void => {
        PERSIST_QUEUE.queuePersist();
    };
    const PERSIST_DRAFT = async (): Promise<boolean> => {
        return await PERSIST_QUEUE.persistDraft();
    };
    const DASHBOARDS = createDashboardRuntime({
        applyPreferencesToDocument,
        collectAllBooks,
        collectFeatureFlagsFromUI,
        collectPreferencesFromUI,
        normalizeFeatureFlags,
        normalizePreferences,
        queuePersist: QUEUE_PERSIST,
        state: STATE,
        updateStatsView,
        updateTodayDashboard,
    });
    const RUNTIME = createInitRuntime({
        focusCalendarToday,
        queuePersist: QUEUE_PERSIST,
        state: STATE,
        updateDashboards: (): void => {
            DASHBOARDS.updateDashboards();
        },
    });

    return {
        addLog,
        announce: ANNOUNCE,
        announceForPlanController: ANNOUNCE_FOR_PLAN_CONTROLLER,
        dashboards: DASHBOARDS,
        persistDraft: PERSIST_DRAFT,
        plannerApi: PLANNER_API,
        queuePersist: QUEUE_PERSIST,
        runtime: RUNTIME,
        setStatus: SET_STATUS,
        state: STATE,
    };
}
