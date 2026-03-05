import type {
    AutoPlanController,
    InitRuntimeArgs,
} from "../../../types/types.js";

/**
 * Creates runtime handlers used by tab changes, book edits, and schedule mutations.
 * @param args - Runtime dependencies from bootstrap.
 * @param focusCalendarToday - Focuses/selects today's calendar entry.
 * @param queuePersist - Schedules persistence for changed inputs.
 * @param state - Shared runtime state container.
 * @param updateDashboards - Refreshes dashboard UI sections.
 * @returns Handler object consumed by initialization and bindings.
 */
export function createInitRuntime(args: InitRuntimeArgs): {
    handleBooksChanged(): void;
    handleScheduleMutation(): void;
    handleTabChange(name: string): void;
    queueAutoPlanIfReady(): void;
    setPlanController(controller: AutoPlanController | null): void;
} {
    let planController: AutoPlanController | null = null;
    const QUEUE_AUTO_PLAN_IF_READY = (): void => {
        if (args.state.ready && planController !== null) {
            planController.queueAutoPlan();
        }
    };
    const HANDLE_TAB_CHANGE = (name: string): void => {
        if (name === "schedule") {
            args.focusCalendarToday();
        }
    };
    const HANDLE_BOOKS_CHANGED = (): void => {
        args.updateDashboards();
        args.queuePersist();
        QUEUE_AUTO_PLAN_IF_READY();
    };
    const HANDLE_SCHEDULE_MUTATION = (): void => {
        args.updateDashboards();
        QUEUE_AUTO_PLAN_IF_READY();
    };
    const SET_PLAN_CONTROLLER = (
        controller: AutoPlanController | null,
    ): void => {
        planController = controller;
    };
    return {
        handleBooksChanged: HANDLE_BOOKS_CHANGED,
        handleScheduleMutation: HANDLE_SCHEDULE_MUTATION,
        handleTabChange: HANDLE_TAB_CHANGE,
        queueAutoPlanIfReady: QUEUE_AUTO_PLAN_IF_READY,
        setPlanController: SET_PLAN_CONTROLLER,
    };
}
