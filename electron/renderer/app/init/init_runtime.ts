import type {
    AutoPlanController,
    InitRuntimeArgs,
} from "../../../types/types.ts";

type InitRuntimeHandlers = {
    handleBooksChanged(): void;
    handleScheduleMutation(): void;
    handleTabChange(name: string): void;
    queueAutoPlanIfReady(): void;
    setPlanController(controller: AutoPlanController | null): void;
};

type PlanControllerGetter = () => AutoPlanController | null;
type PlanControllerSetter = (controller: AutoPlanController | null) => void;

function queueAutoPlan(
    args: InitRuntimeArgs,
    planController: AutoPlanController | null,
): void {
    if (args.state.ready && planController !== null) {
        planController.queueAutoPlan();
    }
}

function handleBooksChangedHandler(
    args: InitRuntimeArgs,
    getPlanController: PlanControllerGetter,
): () => void {
    return (): void => {
        args.updateDashboards();
        args.queuePersist();
        queueAutoPlan(args, getPlanController());
    };
}

function handleScheduleMutationHandler(
    args: InitRuntimeArgs,
    getPlanController: PlanControllerGetter,
): () => void {
    return (): void => {
        args.updateDashboards();
        queueAutoPlan(args, getPlanController());
    };
}

function handleTabChangeHandler(args: InitRuntimeArgs): (name: string) => void {
    return (name: string): void => {
        if (name === "schedule") {
            args.focusCalendarToday();
        }
    };
}

function queueAutoPlanIfReadyHandler(
    args: InitRuntimeArgs,
    getPlanController: PlanControllerGetter,
): () => void {
    return (): void => {
        queueAutoPlan(args, getPlanController());
    };
}

function setPlanControllerHandler(
    setPlanController: PlanControllerSetter,
): (controller: AutoPlanController | null) => void {
    return (controller: AutoPlanController | null): void => {
        setPlanController(controller);
    };
}

function initRuntimeHandlers(
    args: InitRuntimeArgs,
    getPlanController: PlanControllerGetter,
    setPlanController: PlanControllerSetter,
): InitRuntimeHandlers {
    return {
        handleBooksChanged: handleBooksChangedHandler(args, getPlanController),
        handleScheduleMutation: handleScheduleMutationHandler(
            args,
            getPlanController,
        ),
        handleTabChange: handleTabChangeHandler(args),
        queueAutoPlanIfReady: queueAutoPlanIfReadyHandler(
            args,
            getPlanController,
        ),
        setPlanController: setPlanControllerHandler(setPlanController),
    };
}

/**
 * Creates runtime handlers used by tab changes, book edits, and schedule mutations.
 * @param args - Runtime dependencies from bootstrap.
 * @param focusCalendarToday - Focuses/selects today's calendar entry.
 * @param queuePersist - Schedules persistence for changed inputs.
 * @param state - Shared runtime state container.
 * @param updateDashboards - Refreshes dashboard UI sections.
 * @returns Handler object consumed by initialization and bindings.
 */
export function createInitRuntime(args: InitRuntimeArgs): InitRuntimeHandlers {
    let planController: AutoPlanController | null = null;
    const GET_PLAN_CONTROLLER = (): AutoPlanController | null => planController;
    const SET_PLAN_CONTROLLER: PlanControllerSetter = (controller) => {
        planController = controller;
    };
    return initRuntimeHandlers(args, GET_PLAN_CONTROLLER, SET_PLAN_CONTROLLER);
}
