import type {
    PlannerSummary,
    RunPlanGenerationArgs,
} from "../../types/types.ts";

export interface PlanMessages {
    statusGeneratingMessage: string;
    statusSuccessMessage: string;
    successAnnouncement: string;
}

function summaryLog(summary: PlannerSummary | null): string {
    const STATUS = summary?.status ?? "not-set";
    const PLANNED = Number(summary?.total_planned_minutes ?? 0);
    const AVAILABLE = Number(summary?.total_available_minutes ?? 0);
    return `Status ${STATUS}. Planned ${PLANNED}/${AVAILABLE} minutes.`;
}

function logOptionalSummaryText(
    value: unknown,
    addLog: (message: string) => void,
): void {
    if (typeof value !== "string") {
        return;
    }
    if (value === "") {
        return;
    }
    addLog(value);
}

export function logPlanSummary(
    summary: PlannerSummary | null | undefined,
    addLog: (message: string) => void,
): void {
    logOptionalSummaryText(summary?.deprecation_notice, addLog);
    logOptionalSummaryText(summary?.feasibility_warning, addLog);
    addLog(summaryLog(summary ?? null));
}

export function resolvedPlanMessages(
    args: RunPlanGenerationArgs,
): PlanMessages {
    return {
        statusGeneratingMessage:
            args.statusGeneratingMessage ?? "Generating plan...",
        statusSuccessMessage: args.statusSuccessMessage ?? "Plan generated.",
        successAnnouncement:
            args.successAnnouncement ?? "Plan generated and schedule updated.",
    };
}
