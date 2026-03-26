const MIN_GOAL_MINUTES = 1;
const MAX_PERCENT = 100;
const MIN_PERCENT = 0;

/**
 * Computes bounded goal-completion percentage for today's minutes.
 * @param todayMinutesRaw - Minutes logged today.
 * @param goalMinutesRaw - Daily goal minutes.
 * @returns Integer percent between 0 and 100.
 */
export function goalProgressPercent(
    todayMinutesRaw: number,
    goalMinutesRaw: number,
): number {
    const GOAL_MINUTES = Math.max(
        MIN_GOAL_MINUTES,
        Number(goalMinutesRaw || MIN_GOAL_MINUTES),
    );
    const TODAY_MINUTES = Math.max(
        MIN_PERCENT,
        Number(todayMinutesRaw || MIN_PERCENT),
    );
    const RAW_PERCENT = Math.round(
        (TODAY_MINUTES / GOAL_MINUTES) * MAX_PERCENT,
    );
    const BOUNDED = Math.min(MAX_PERCENT, RAW_PERCENT);
    return Math.max(MIN_PERCENT, BOUNDED);
}
