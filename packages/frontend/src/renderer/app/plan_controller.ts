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
const AUTO_PLAN_GENERATING_MESSAGE = "Updating Schedule";
const AUTO_PLAN_SUCCESS_ANNOUNCEMENT = "";
const AUTO_PLAN_SUCCESS_MESSAGE = "Schedule Updated";
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
    runVersion: number,
): RunPlanGenerationArgs {
    return {
        ...args,
        isRunCurrent: (): boolean =>
            autoPlanRunIsCurrent(args.state, runVersion),
        onSuccess: createAutoPlanSuccessHandler(args),
        statusGeneratingMessage: AUTO_PLAN_GENERATING_MESSAGE,
        statusSuccessMessage: AUTO_PLAN_SUCCESS_MESSAGE,
        successAnnouncement: AUTO_PLAN_SUCCESS_ANNOUNCEMENT,
    };
}

async function executeAutoPlan(
    args: RunAutoPlanFactoryArgs,
    runVersion: number,
): Promise<void> {
    await runPlanGeneration(autoPlanGenerationArgs(args, runVersion));
}

function markAutoPlanQueued(state: AutoPlanState): void {
    const STATE = state;
    STATE.autoRunPending = true;
    STATE.autoRunVersion += 1;
}

function startAutoPlanRun(state: AutoPlanState): number {
    const STATE = state;
    STATE.activeRunCount += 1;
    STATE.autoRunInFlight = true;
    STATE.autoRunPending = false;
    return STATE.autoRunVersion;
}

function finalizeAutoPlanRun(state: AutoPlanState): void {
    const STATE = state;
    STATE.activeRunCount = Math.max(0, STATE.activeRunCount - 1);
    if (STATE.activeRunCount > 0) {
        return;
    }
    STATE.autoRunInFlight = false;
}

function autoPlanRunIsCurrent(
    state: AutoPlanState,
    runVersion: number,
): boolean {
    return state.autoRunVersion === runVersion;
}

function autoPlanFailureHandler(
    addLog: PlanControllerArgs["addLog"],
    setStatus: PlanControllerArgs["setStatus"],
): (_error: unknown) => void {
    return (_error: unknown): void => {
        addLog(AUTO_PLAN_FAILURE_MESSAGE);
        setStatus(AUTO_PLAN_FAILURE_MESSAGE, true, "error");
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
    return {
        activeRunCount: 0,
        autoRunInFlight: false,
        autoRunPending: false,
        autoRunVersion: 0,
    };
}

function createRunAutoPlan(args: RunAutoPlanFactoryArgs): () => Promise<void> {
    const STATE = args.state;
    const RUN = async (): Promise<void> => {
        const RUN_VERSION = startAutoPlanRun(STATE);
        try {
            await executeAutoPlan(args, RUN_VERSION);
        } finally {
            finalizeAutoPlanRun(STATE);
        }
    };
    return RUN;
}

function createAutoPlanRunner(args: PlanControllerArgs): AutoPlanRunner {
    const SCHEDULE_AUTO_PLAN = createScheduleAutoPlan(
        args.addLog,
        args.setStatus,
    );
    const RUN_AUTO_PLAN_ARGS = {
        ...args,
        scheduleAutoPlan: SCHEDULE_AUTO_PLAN,
        state: autoPlanState(),
    };
    const RUN_AUTO_PLAN = createRunAutoPlan(RUN_AUTO_PLAN_ARGS);
    return {
        queueAutoPlan: (): void => {
            markAutoPlanQueued(RUN_AUTO_PLAN_ARGS.state);
            SCHEDULE_AUTO_PLAN(RUN_AUTO_PLAN);
        },
    };
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
