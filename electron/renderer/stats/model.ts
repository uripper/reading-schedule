import type { SnapshotInputs, StatsSnapshot } from "../../types/types.ts";
import {
    activeDayCount,
    dayMinutesFromActivity,
    streakFromDayMinutes,
    totalMinutes,
} from "../activity/day-minutes.ts";
import { readBooksFinishedThisYear, statusBreakdown } from "./helpers.ts";
import {
    averageProgress,
    completionStats,
    monthlyFinishCounts,
    plannedFinishBookIds,
} from "./helpers-metrics.ts";

const MIN_GOAL_MINUTES = 1;

/**
 * Normalizes daily goal minutes to a minimum valid value.
 * @param goalMinutes - Optional goal minutes input.
 * @returns Goal minutes clamped to at least 1.
 */
function normalizedGoalMinutes(goalMinutes: number | undefined): number {
    return Math.max(MIN_GOAL_MINUTES, Number(goalMinutes ?? MIN_GOAL_MINUTES));
}

function buildMinutesByDay(
    inputs: SnapshotInputs,
    year: number | null,
): ReturnType<typeof dayMinutesFromActivity> {
    return dayMinutesFromActivity({
        lastResult: inputs.lastResult,
        scheduleCompletions: inputs.scheduleCompletions,
        sessions: inputs.sessions,
        year,
    });
}

function buildFinishSummary(
    books: SnapshotInputs["books"],
    lastResult: SnapshotInputs["lastResult"],
    year: number,
): {
    planned: ReturnType<typeof plannedFinishBookIds>;
    projectedFinishCount: number;
    readThisYearIds: Set<string>;
} {
    const READ_THIS_YEAR_IDS = readBooksFinishedThisYear(books, year);
    const PLANNED = plannedFinishBookIds(lastResult, year);
    const PROJECTED = new Set([...READ_THIS_YEAR_IDS, ...PLANNED.ids]);

    return {
        planned: PLANNED,
        projectedFinishCount: PROJECTED.size,
        readThisYearIds: READ_THIS_YEAR_IDS,
    };
}

function buildActivitySummary(
    inputs: SnapshotInputs,
    year: number,
): {
    allTime: ReturnType<typeof dayMinutesFromActivity>;
    goalMinutes: number;
    thisYear: ReturnType<typeof dayMinutesFromActivity>;
} {
    return {
        allTime: buildMinutesByDay(inputs, null),
        goalMinutes: normalizedGoalMinutes(inputs.dailyGoalMinutes),
        thisYear: buildMinutesByDay(inputs, year),
    };
}

function buildStatsSnapshotResult(args: {
    activitySummary: ReturnType<typeof buildActivitySummary>;
    books: SnapshotInputs["books"];
    completion: ReturnType<typeof completionStats>;
    finishSummary: ReturnType<typeof buildFinishSummary>;
    progress: ReturnType<typeof averageProgress>;
    year: number;
}): StatsSnapshot {
    return {
        activeDaysYear: activeDayCount(args.activitySummary.thisYear),
        averageProgressPercent: args.progress.averagePercent,
        booksStartedCount: args.progress.startedCount,
        completedSessionsToDate: args.completion.completed,
        completionRatePercent: args.completion.ratePercent,
        readingMinutesYear: totalMinutes(args.activitySummary.thisYear),
        scheduledSessionsToDate: args.completion.scheduled,
        statusBreakdown: statusBreakdown(args.books),
        totalBooks: args.books.length,
        year: args.year,
        ...buildStreakAndFinishStats(args),
    };
}

function statsSnapshotResultArgs(options: {
    activitySummary: ReturnType<typeof buildActivitySummary>;
    books: SnapshotInputs["books"];
    computation: ReturnType<typeof statsSnapshotComputation>;
    year: number;
}) {
    return {
        activitySummary: options.activitySummary,
        books: options.books,
        completion: options.computation.completion,
        finishSummary: options.computation.finishSummary,
        progress: options.computation.progress,
        year: options.year,
    };
}

function statsSnapshotComputation(options: {
    books: SnapshotInputs["books"];
    lastResult: SnapshotInputs["lastResult"];
    scheduleCompletions: SnapshotInputs["scheduleCompletions"];
    year: number;
}): {
    completion: ReturnType<typeof completionStats>;
    finishSummary: ReturnType<typeof buildFinishSummary>;
    progress: ReturnType<typeof averageProgress>;
} {
    return {
        completion: completionStats(
            options.lastResult,
            options.scheduleCompletions,
            options.year,
        ),
        finishSummary: buildFinishSummary(
            options.books,
            options.lastResult,
            options.year,
        ),
        progress: averageProgress(options.books),
    };
}

function buildStreakAndFinishStats(args: {
    activitySummary: ReturnType<typeof buildActivitySummary>;
    books: SnapshotInputs["books"];
    finishSummary: ReturnType<typeof buildFinishSummary>;
}): Pick<
    StatsSnapshot,
    | "currentStreakDays"
    | "finishedThisYearCount"
    | "monthlyFinishes"
    | "plannedFinishCount"
    | "projectedFinishCount"
> {
    return {
        currentStreakDays: streakFromDayMinutes(
            args.activitySummary.allTime,
            args.activitySummary.goalMinutes,
        ),
        finishedThisYearCount: args.finishSummary.readThisYearIds.size,
        monthlyFinishes: monthlyFinishCounts(
            args.finishSummary.readThisYearIds,
            args.books,
            args.finishSummary.planned.monthByBookId,
        ),
        plannedFinishCount: args.finishSummary.planned.ids.size,
        projectedFinishCount: args.finishSummary.projectedFinishCount,
    };
}

/**
 * Builds a full stats snapshot used by the Stats dashboard renderer.
 * @param root0 - Snapshot input values.
 * @param books - Current book catalog.
 * @param sessions - Logged reading sessions.
 * @param lastResult - Latest planner result.
 * @param scheduleCompletions - Completion map keyed by schedule row.
 * @param dailyGoalMinutes - Optional daily goal minutes.
 * @returns Aggregated stats snapshot for rendering.
 */
export function buildStatsSnapshot(inputs: SnapshotInputs): StatsSnapshot {
    const YEAR = new Date().getFullYear();
    const ACTIVITY_SUMMARY = buildActivitySummary(inputs, YEAR);
    const COMPUTATION = statsSnapshotComputation({
        books: inputs.books,
        lastResult: inputs.lastResult,
        scheduleCompletions: inputs.scheduleCompletions,
        year: YEAR,
    });
    return buildStatsSnapshotResult(
        statsSnapshotResultArgs({
            activitySummary: ACTIVITY_SUMMARY,
            books: inputs.books,
            computation: COMPUTATION,
            year: YEAR,
        }),
    );
}
