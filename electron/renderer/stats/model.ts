import type { SnapshotInputs, StatsSnapshot } from "../../types/types.ts";
import {
    activeDayCount,
    dayMinutesFromActivity,
    streakFromDayMinutes,
    totalMinutes,
} from "../activity/day-minutes.ts";
import {
    averageProgress,
    completionStats,
    monthlyFinishCounts,
    plannedFinishBookIds,
    readBooksFinishedThisYear,
    statusBreakdown,
} from "./helpers.ts";

const MIN_GOAL_MINUTES = 1;

/**
 * Normalizes daily goal minutes to a minimum valid value.
 * @param goalMinutes - Optional goal minutes input.
 * @returns Goal minutes clamped to at least 1.
 */
function normalizedGoalMinutes(goalMinutes: number | undefined): number {
    return Math.max(MIN_GOAL_MINUTES, Number(goalMinutes ?? MIN_GOAL_MINUTES));
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
export function buildStatsSnapshot({
    books,
    sessions,
    lastResult,
    scheduleCompletions,
    dailyGoalMinutes,
}: SnapshotInputs): StatsSnapshot {
    const YEAR = new Date().getFullYear();
    const MINUTES_BY_DAY_THIS_YEAR = dayMinutesFromActivity({
        lastResult,
        scheduleCompletions,
        sessions,
        year: YEAR,
    });
    const MINUTES_BY_DAY_ALL_TIME = dayMinutesFromActivity({
        lastResult,
        scheduleCompletions,
        sessions,
        year: null,
    });
    const PROGRESS = averageProgress(books);
    const COMPLETION = completionStats(lastResult, scheduleCompletions, YEAR);
    const READ_THIS_YEAR_IDS = readBooksFinishedThisYear(books, YEAR);
    const PLANNED = plannedFinishBookIds(lastResult, YEAR);
    const PROJECTED = new Set([...READ_THIS_YEAR_IDS, ...PLANNED.ids]);
    const GOAL_MINUTES = normalizedGoalMinutes(dailyGoalMinutes);

    return {
        activeDaysYear: activeDayCount(MINUTES_BY_DAY_THIS_YEAR),
        averageProgressPercent: PROGRESS.averagePercent,
        booksStartedCount: PROGRESS.startedCount,
        completedSessionsToDate: COMPLETION.completed,
        completionRatePercent: COMPLETION.ratePercent,
        currentStreakDays: streakFromDayMinutes(
            MINUTES_BY_DAY_ALL_TIME,
            GOAL_MINUTES,
        ),
        finishedThisYearCount: READ_THIS_YEAR_IDS.size,
        monthlyFinishes: monthlyFinishCounts(
            READ_THIS_YEAR_IDS,
            books,
            PLANNED.monthByBookId,
        ),
        plannedFinishCount: PLANNED.ids.size,
        projectedFinishCount: PROJECTED.size,
        readingMinutesYear: totalMinutes(MINUTES_BY_DAY_THIS_YEAR),
        scheduledSessionsToDate: COMPLETION.scheduled,
        statusBreakdown: statusBreakdown(books),
        totalBooks: books.length,
        year: YEAR,
    };
}
