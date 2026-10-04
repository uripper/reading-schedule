/** Reports planner completion and explains an empty explicit Today replan. */

import type {
    PlannerRunData,
    RunPlanGenerationArgs,
} from "../../types/types.ts";
import { todayDayKey } from "./date_keys.ts";

const INCOMPLETE_STATUS_NAME = "INCOMPLETE";
const PLAN_INCOMPLETE_MESSAGE = "Plan incomplete.";
const TODAY_SUCCESS_MESSAGE = "Today Replanned";
const EMPTY_TODAY_MESSAGE =
    "Today replanned. No new sessions fit today's budget and book constraints. Check reading days, dependencies, and available minutes, or add a session manually.";

/** Explains why no replacement appeared instead of reporting generic success. */
function successMessage(data: PlannerRunData, message: string): string {
    if (message !== TODAY_SUCCESS_MESSAGE) {
        return message;
    }
    const TODAY = todayDayKey();
    if (data.schedule.some((row) => row.date === TODAY)) {
        return message;
    }
    return EMPTY_TODAY_MESSAGE;
}

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
    args.setStatus(
        successMessage(args.data, args.statusSuccessMessage),
        false,
        "success",
    );
}
