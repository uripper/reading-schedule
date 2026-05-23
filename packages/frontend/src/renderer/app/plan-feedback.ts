import type {
    PlannerScheduleRow,
    PlannerSummary,
    RunPlanGenerationArgs,
} from "../../types/types.ts";

const SINGULAR_COUNT = 1;

export interface PlanMessages {
    statusGeneratingMessage: string;
    statusSuccessMessage: string;
    successAnnouncement: string;
}

function pluralized(value: number, unit: string): string {
    if (value === SINGULAR_COUNT) {
        return unit;
    }
    return `${unit}s`;
}

function scheduledBookCount(schedule: PlannerScheduleRow[]): number {
    const BOOK_IDS = new Set<string>();
    for (const ROW of schedule) {
        BOOK_IDS.add(ROW.book_id);
    }
    return BOOK_IDS.size;
}

function scheduledDayCount(schedule: PlannerScheduleRow[]): number {
    const DAYS = new Set<string>();
    for (const ROW of schedule) {
        DAYS.add(ROW.date);
    }
    return DAYS.size;
}

function summaryLog(
    summary: PlannerSummary | null,
    schedule: PlannerScheduleRow[],
): string {
    const STATUS = summary?.status ?? "not-set";
    const PLANNED = Number(summary?.total_planned_minutes ?? 0);
    const BOOKS = scheduledBookCount(schedule);
    const DAYS = scheduledDayCount(schedule);
    return `Status ${STATUS}. Planned ${PLANNED} ${pluralized(
        PLANNED,
        "minute",
    )}, ${BOOKS} ${pluralized(BOOKS, "book")}, across ${DAYS} ${pluralized(
        DAYS,
        "day",
    )}.`;
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
    schedule: PlannerScheduleRow[],
    addLog: (message: string) => void,
): void {
    logOptionalSummaryText(summary?.deprecation_notice, addLog);
    logOptionalSummaryText(summary?.feasibility_warning, addLog);
    addLog(summaryLog(summary ?? null, schedule));
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
