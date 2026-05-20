const ZERO_COUNT = 0;
const MIN_GOAL_MINUTES = 1;
const SINGLE_DAY_COUNT = 1;

/**
 * Normalizes count-like values to non-negative integers.
 * @param valueRaw - Raw count value.
 * @returns Non-negative integer count.
 */
function nonNegativeCount(valueRaw: number): number {
    const VALUE = Number(valueRaw);
    if (!Number.isFinite(VALUE)) {
        return ZERO_COUNT;
    }
    const INTEGER = Math.floor(VALUE);
    if (INTEGER < ZERO_COUNT) {
        return ZERO_COUNT;
    }
    return INTEGER;
}

/**
 * Bounds completed-session count within scheduled-session range.
 * @param completedSessionsRaw - Completed session count.
 * @param scheduledSessionsRaw - Scheduled session count.
 * @returns Completed count clamped to [0, scheduled].
 */
function boundedCompletedSessions(
    completedSessionsRaw: number,
    scheduledSessionsRaw: number,
): number {
    const SCHEDULED = nonNegativeCount(scheduledSessionsRaw);
    const COMPLETED = nonNegativeCount(completedSessionsRaw);
    return Math.min(COMPLETED, SCHEDULED);
}

/**
 * Formats streak day-count text for the top header metric.
 * @param streakDaysRaw - Current streak day count.
 * @returns Header-ready streak text.
 */
export function formatStreakText(streakDaysRaw: number): string {
    const STREAK_DAYS = nonNegativeCount(streakDaysRaw);
    if (STREAK_DAYS === SINGLE_DAY_COUNT) {
        return "1";
    }
    return String(STREAK_DAYS);
}

/**
 * Formats sessions text for the top header metric.
 * @param completedSessionsRaw - Completed sessions count.
 * @param scheduledSessionsRaw - Scheduled sessions count.
 * @returns Header-ready session summary text.
 */
export function formatHeaderSessionsText(
    completedSessionsRaw: number,
    scheduledSessionsRaw: number,
): string {
    const SCHEDULED = nonNegativeCount(scheduledSessionsRaw);
    const COMPLETED = boundedCompletedSessions(
        completedSessionsRaw,
        scheduledSessionsRaw,
    );
    return `${COMPLETED}/${SCHEDULED} logged`;
}

/**
 * Builds visual completion states for the session dot grid.
 * @param completedSessionsRaw - Completed sessions count.
 * @param scheduledSessionsRaw - Scheduled sessions count.
 * @returns Boolean completion list in scheduled-session order.
 */
export function buildSessionDotStates(
    completedSessionsRaw: number,
    scheduledSessionsRaw: number,
): boolean[] {
    const SCHEDULED = nonNegativeCount(scheduledSessionsRaw);
    const COMPLETED = boundedCompletedSessions(
        completedSessionsRaw,
        scheduledSessionsRaw,
    );
    const DOT_STATES: boolean[] = [];
    for (let index = ZERO_COUNT; index < SCHEDULED; index += 1) {
        DOT_STATES.push(index < COMPLETED);
    }
    return DOT_STATES;
}

/**
 * Checks whether today's logged minutes satisfy the daily goal.
 * @param todayMinutesRaw - Logged minutes for today.
 * @param goalMinutesRaw - Daily goal minutes.
 * @returns True when today's minutes meet or exceed the goal.
 */
export function isHeaderGoalComplete(
    todayMinutesRaw: number,
    goalMinutesRaw: number,
): boolean {
    const GOAL_MINUTES = Math.max(
        MIN_GOAL_MINUTES,
        nonNegativeCount(goalMinutesRaw),
    );
    const TODAY_MINUTES = nonNegativeCount(todayMinutesRaw);
    if (TODAY_MINUTES < GOAL_MINUTES) {
        return false;
    }
    return true;
}

/**
 * Checks whether all scheduled sessions are completed.
 * @param completedSessionsRaw - Completed sessions count.
 * @param scheduledSessionsRaw - Scheduled sessions count.
 * @returns True when scheduled sessions exist and all are complete.
 */
export function isHeaderSessionsComplete(
    completedSessionsRaw: number,
    scheduledSessionsRaw: number,
): boolean {
    const SCHEDULED = nonNegativeCount(scheduledSessionsRaw);
    if (SCHEDULED === ZERO_COUNT) {
        return false;
    }
    const COMPLETED = boundedCompletedSessions(
        completedSessionsRaw,
        scheduledSessionsRaw,
    );
    if (COMPLETED < SCHEDULED) {
        return false;
    }
    return true;
}
