import type {
    PlannerRunData,
    RunPlanGenerationArgs,
} from "../../types/types.ts";

const INCOMPLETE_STATUS_NAME = "INCOMPLETE";
const PLAN_INCOMPLETE_MESSAGE = "Plan incomplete.";

function incompletePlanMessage(data: PlannerRunData): string {
    const WARNING = data.summary?.feasibility_warning;
    if (typeof WARNING === "string" && WARNING !== "") {
        return WARNING;
    }
    return PLAN_INCOMPLETE_MESSAGE;
}

/**
 * Applies user-visible status for a completed planner run.
 * @param args - Planner data and status sink.
 */
export function applyPlanResultStatus(args: {
    data: PlannerRunData;
    setStatus: RunPlanGenerationArgs["setStatus"];
    statusSuccessMessage: string;
}): void {
    if (args.data.summary?.status === INCOMPLETE_STATUS_NAME) {
        args.setStatus(incompletePlanMessage(args.data), true, "error");
        return;
    }
    args.setStatus(args.statusSuccessMessage, false, "success");
}
