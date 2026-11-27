/**
 * Builds the plan controller from renderer state and UI dependencies.
 */

import type {
    AppBootstrapContext,
    PlanControllerArgs,
    PlannerResult,
} from "../../../types/types.ts";
import { collectBooks, setBookScheduleRows } from "../../books/controller.ts";
import { renderCalendar } from "../../calendar.ts";
import { addLog } from "../../help.ts";
import { collectSettings } from "../../settings.ts";
import { totalsFromSummary } from "../runtime_helpers.ts";
import { applyAppStateMutation } from "../state_mutations.ts";
import { createAppPlanControllerInstance } from "./init-helpers.ts";

function stateBindings(appContext: AppBootstrapContext): {
    setLastResult: (nextResult: PlannerResult) => void;
    setScheduleCompletions: (next: Record<string, boolean>) => void;
    updateTodayView: () => void;
} {
    return {
        setLastResult: (nextResult: PlannerResult): void => {
            applyAppStateMutation(appContext.state, {
                lastResult: nextResult,
                type: "set_last_result",
            });
        },
        setScheduleCompletions: (next: Record<string, boolean>): void => {
            applyAppStateMutation(appContext.state, {
                scheduleCompletions: next,
                type: "set_schedule_completions",
            });
        },
        updateTodayView: (): void => {
            appContext.dashboards.updateDashboards();
        },
    };
}

function stateSelectors(appContext: AppBootstrapContext) {
    return {
        getBlockedDayBooks: (): Record<string, boolean> =>
            appContext.state.blockedDayBooks,
        getLastResult: (): PlannerResult | null => appContext.state.lastResult,
        getScheduleCompletions: (): Record<string, boolean> =>
            appContext.state.scheduleCompletions,
    };
}

/**
 * Collects the runtime-bound plan controller dependencies.
 * @param appContext - Shared renderer context.
 * @returns Arguments for one plan controller.
 */
export function planControllerArgs(
    appContext: AppBootstrapContext,
): PlanControllerArgs {
    const BINDINGS = stateBindings(appContext);
    return {
        addLog,
        announce: (message, politeness): void => {
            appContext.announceForPlanController(message, politeness);
        },
        collectBooks,
        collectSettings,
        persistDraft: async (): Promise<boolean> =>
            await appContext.persistDraft(),
        plannerApi: appContext.plannerApi,
        renderCalendar,
        setBookScheduleRows,
        setLastResult: BINDINGS.setLastResult,
        setScheduleCompletions: BINDINGS.setScheduleCompletions,
        setStatus: appContext.setStatus,
        totalsFromSummary,
        updateTodayView: BINDINGS.updateTodayView,
        ...stateSelectors(appContext),
    };
}

/**
 * Creates the runtime-bound plan controller used by automatic and Today replans.
 * @param appContext - Shared renderer context.
 * @returns Configured plan controller.
 */
export function buildPlanController(appContext: AppBootstrapContext) {
    return createAppPlanControllerInstance(planControllerArgs(appContext));
}
