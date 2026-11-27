/** Debounces automatic plan runs and reports failures of scheduled runs. */
import type {
    AutoPlanScheduler,
    PlanControllerArgs,
} from "../../types/types.ts";
import { PLAN_FAILURE_MESSAGE } from "../errors/index.ts";

const AUTO_PLAN_DELAY_MS = 450;

/** Reports a failed scheduled run in the log and status bar. */
function autoPlanFailureHandler(
    addLog: PlanControllerArgs["addLog"],
    setStatus: PlanControllerArgs["setStatus"],
): (_error: unknown) => void {
    return (_error: unknown): void => {
        addLog(PLAN_FAILURE_MESSAGE);
        setStatus(PLAN_FAILURE_MESSAGE, true, "error");
    };
}

/** Starts a scheduled run and routes its failure to the handler. */
function runScheduledAutoPlan(
    runner: () => Promise<void>,
    onFailure: (_error: unknown) => void,
): void {
    runner().catch(onFailure);
}

/**
 * Creates the debounced auto-plan scheduler.
 * @param addLog - Log sink for failed scheduled runs.
 * @param setStatus - Status sink for failed scheduled runs.
 * @returns Scheduler with a cancel hook for workspace switches.
 */
export function createAutoPlanScheduler(
    addLog: PlanControllerArgs["addLog"],
    setStatus: PlanControllerArgs["setStatus"],
): AutoPlanScheduler {
    let autoTimer: ReturnType<typeof setTimeout> | null = null;
    const ON_FAILURE = autoPlanFailureHandler(addLog, setStatus);
    const CANCEL = (): void => {
        if (autoTimer !== null) {
            clearTimeout(autoTimer);
        }
        autoTimer = null;
    };
    return {
        cancel: CANCEL,
        schedule: (runner: () => Promise<void>): void => {
            CANCEL();
            autoTimer = setTimeout((): void => {
                autoTimer = null;
                runScheduledAutoPlan(runner, ON_FAILURE);
            }, AUTO_PLAN_DELAY_MS);
        },
    };
}
