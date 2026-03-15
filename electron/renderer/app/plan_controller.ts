import type {
    ApplyPlannedDataArgs,
    AutoPlanRunner,
    AutoPlanState,
    PlanController,
    PlanControllerArgs,
    PlannerResult,
    PlannerRunData,
    RunAutoPlanFactoryArgs,
    RunPlanGenerationArgs,
} from "../../types/types.ts";
import { runPlanGeneration } from "./plan.ts";
import {
    applyLoadedResult,
    applyPlannedData,
} from "./plan_controller_apply.ts";

const AUTO_PLAN_DELAY_MS = 450;
const AUTO_PLAN_FAILURE_MESSAGE = "Automatic plan refresh failed.";
const AUTO_PLAN_GENERATING_MESSAGE = "Updating plan...";
const AUTO_PLAN_SUCCESS_ANNOUNCEMENT = "";
const AUTO_PLAN_SUCCESS_MESSAGE = "Plan updated.";
const DEFAULT_LAST_RESULT: PlannerResult = {
    created_at: "",
    schedule: [],
    summary: null,
};

function autoPlanApplyArgs(
    args: RunAutoPlanFactoryArgs,
    data: PlannerRunData,
): ApplyPlannedDataArgs {
    return { ...args, data, preserveLockedDays: true };
}

async function applyAutoPlanSuccess(
    args: RunAutoPlanFactoryArgs,
    data: PlannerRunData,
): Promise<void> {
    await applyPlannedData(autoPlanApplyArgs(args, data));
}

function createAutoPlanSuccessHandler(
    args: RunAutoPlanFactoryArgs,
): (data: PlannerRunData) => Promise<void> {
    return async (data: PlannerRunData): Promise<void> =>
        await applyAutoPlanSuccess(args, data);
}

function autoPlanGenerationArgs(
    args: RunAutoPlanFactoryArgs,
): RunPlanGenerationArgs {
    return {
        ...args,
        onSuccess: createAutoPlanSuccessHandler(args),
        statusGeneratingMessage: AUTO_PLAN_GENERATING_MESSAGE,
        statusSuccessMessage: AUTO_PLAN_SUCCESS_MESSAGE,
        successAnnouncement: AUTO_PLAN_SUCCESS_ANNOUNCEMENT,
    };
}

async function executeAutoPlan(args: RunAutoPlanFactoryArgs): Promise<void> {
    await runPlanGeneration(autoPlanGenerationArgs(args));
}

function markAutoPlanPending(state: AutoPlanState): boolean {
    if (!state.autoRunInFlight) {
        return false;
    }
    const STATE = state;
    STATE.autoRunPending = true;
    return true;
}

function markAutoPlanInFlight(state: AutoPlanState): void {
    const STATE = state;
    STATE.autoRunInFlight = true;
}

function finalizeAutoPlanRun(
    state: AutoPlanState,
    scheduleAutoPlan: RunAutoPlanFactoryArgs["scheduleAutoPlan"],
    runner: () => Promise<void>,
): void {
    const STATE = state;
    STATE.autoRunInFlight = false;
    if (!STATE.autoRunPending) {
        return;
    }
    STATE.autoRunPending = false;
    scheduleAutoPlan(runner);
}

function autoPlanFailureHandler(
    addLog: PlanControllerArgs["addLog"],
    setStatus: PlanControllerArgs["setStatus"],
): (_error: unknown) => void {
    return (_error: unknown): void => {
        addLog(AUTO_PLAN_FAILURE_MESSAGE);
        setStatus(AUTO_PLAN_FAILURE_MESSAGE, true);
    };
}

function runScheduledAutoPlan(
    runner: () => Promise<void>,
    onFailure: (_error: unknown) => void,
): void {
    runner().catch(onFailure);
}

function createScheduleAutoPlan(
    addLog: PlanControllerArgs["addLog"],
    setStatus: PlanControllerArgs["setStatus"],
): RunAutoPlanFactoryArgs["scheduleAutoPlan"] {
    let autoTimer: ReturnType<typeof setTimeout> | null = null;
    const ON_FAILURE = autoPlanFailureHandler(addLog, setStatus);
    return (runner: () => Promise<void>): void => {
        if (autoTimer !== null) {
            clearTimeout(autoTimer);
        }
        autoTimer = setTimeout((): void => {
            runScheduledAutoPlan(runner, ON_FAILURE);
        }, AUTO_PLAN_DELAY_MS);
    };
}

function autoPlanState(): AutoPlanState {
    return { autoRunInFlight: false, autoRunPending: false };
}

function createRunAutoPlan(args: RunAutoPlanFactoryArgs): () => Promise<void> {
    const STATE = args.state;
    const RUN = async (): Promise<void> => {
        if (markAutoPlanPending(STATE)) {
            return;
        }
        markAutoPlanInFlight(STATE);
        try {
            await executeAutoPlan(args);
        } finally {
            finalizeAutoPlanRun(STATE, args.scheduleAutoPlan, RUN);
        }
    };
    return RUN;
}

function createAutoPlanRunner(args: PlanControllerArgs): AutoPlanRunner {
    const SCHEDULE_AUTO_PLAN = createScheduleAutoPlan(
        args.addLog,
        args.setStatus,
    );
    const RUN_AUTO_PLAN = createRunAutoPlan({
        ...args,
        scheduleAutoPlan: SCHEDULE_AUTO_PLAN,
        state: autoPlanState(),
    });
    return { queueAutoPlan: (): void => SCHEDULE_AUTO_PLAN(RUN_AUTO_PLAN) };
}

function applySavedResult(
    args: PlanControllerArgs,
    savedResult: PlannerResult | null,
): void {
    applyLoadedResult({
        addLog: args.addLog,
        defaultLastResult: DEFAULT_LAST_RESULT,
        renderCalendar: args.renderCalendar,
        savedResult,
        setBookScheduleRows: args.setBookScheduleRows,
        setLastResult: args.setLastResult,
        totalsFromSummary: args.totalsFromSummary,
    });
}

export function createPlanController(
    root0: PlanControllerArgs,
): PlanController {
    const AUTO_PLAN_RUNNER = createAutoPlanRunner(root0);
    return {
        applyLoadedResult: (savedResult: PlannerResult | null): void => {
            applySavedResult(root0, savedResult);
        },
        queueAutoPlan: AUTO_PLAN_RUNNER.queueAutoPlan,
    };
}
