import { dayKeyFromDate } from "../app/date_keys.ts";

export const DEFAULT_MAX_BOOKS_PER_DAY = 2;
export const DEFAULT_MAX_BLOCKS_PER_BOOK_PER_DAY = 1440;
export const DEFAULT_MINUTES_PER_DAY = 30;
const DEFAULT_PLAN_HORIZON_YEARS = 10;
export const DEFAULT_PLAN_MODE = "finish_soon";
export const DEFAULT_TIME_QUANTUM_MINUTES = 1;
export const DEFAULT_WPM_BASE = 250;

/**
 * Returns the automatic planner horizon used when users do not pick end dates.
 * @param startDateKey - Planner start date in `YYYY-MM-DD` format.
 * @returns Future end date key.
 */
export function automaticPlannerEndDate(startDateKey: string): string {
    const START_DATE = new Date(`${startDateKey}T00:00:00`);
    START_DATE.setFullYear(
        START_DATE.getFullYear() + DEFAULT_PLAN_HORIZON_YEARS,
    );
    return dayKeyFromDate(START_DATE);
}
