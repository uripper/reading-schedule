import { type SnapshotInputs, type StatsSnapshot } from "../../types/types.js";
import {
    activeDayCount,
    dayMinutesFromActivity,
    streakFromDayMinutes,
    totalMinutes,
} from "../activity/day_minutes.js";
import {
    averageProgress,
    completionStats,
    monthlyFinishCounts,
    plannedFinishBookIds,
    readBooksFinishedThisYear,
    statusBreakdown,
} from "./helpers.js";

const MIN_GOAL_MINUTES = 1;

/**
 * Normalizes daily goal minutes to a minimum valid value.
 * @param goalMinutes Optional goal minutes input.
 * @returns Goal minutes clamped to at least 1.
 */
function normalizedGoalMinutes(goalMinutes: number | undefined): number {
    return Math.max(MIN_GOAL_MINUTES, Number(goalMinutes ?? MIN_GOAL_MINUTES));
}

/**
 * Builds a full stats snapshot used by the Stats dashboard renderer.
 * @param root0 Snapshot input values.
 * @param root0.books Current book catalog.
 * @param root0.sessions Logged reading sessions.
 * @param root0.lastResult Latest planner result.
 * @param root0.scheduleCompletions Completion map keyed by schedule row.
 * @param root0.dailyGoalMinutes Optional daily goal minutes.
 * @returns Aggregated stats snapshot for rendering.
 */
export function buildStatsSnapshot({
    books,
    sessions,
    lastResult,
    scheduleCompletions,
    dailyGoalMinutes,
}: SnapshotInputs): StatsSnapshot {
    const year = new Date().getFullYear();
    const minutesByDayThisYear = dayMinutesFromActivity({
        lastResult,
        scheduleCompletions,
        sessions,
        year,
    });
    const minutesByDayAllTime = dayMinutesFromActivity({
        lastResult,
        scheduleCompletions,
        sessions,
        year: null,
    });
    const progress = averageProgress(books);
    const completion = completionStats(lastResult, scheduleCompletions, year);
    const readThisYearIds = readBooksFinishedThisYear(books, year);
    const planned = plannedFinishBookIds(lastResult, year);
    const projected = new Set([...readThisYearIds, ...planned.ids]);
    const goalMinutes = normalizedGoalMinutes(dailyGoalMinutes);

    return {
        activeDaysYear: activeDayCount(minutesByDayThisYear),
        averageProgressPercent: progress.averagePercent,
        booksStartedCount: progress.startedCount,
        completedSessionsToDate: completion.completed,
        completionRatePercent: completion.ratePercent,
        currentStreakDays: streakFromDayMinutes(
            minutesByDayAllTime,
            goalMinutes,
        ),
        finishedThisYearCount: readThisYearIds.size,
        monthlyFinishes: monthlyFinishCounts(
            readThisYearIds,
            books,
            planned.monthByBookId,
        ),
        plannedFinishCount: planned.ids.size,
        projectedFinishCount: projected.size,
        readingMinutesYear: totalMinutes(minutesByDayThisYear),
        scheduledSessionsToDate: completion.scheduled,
        statusBreakdown: statusBreakdown(books),
        totalBooks: books.length,
        year,
    };
}
