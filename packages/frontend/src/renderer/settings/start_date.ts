/**
 * Normalizes planner start-date behavior for the settings form and plan
 * submission flow.
 */
import { todayDayKey } from "../app/date_keys.ts";

/**
 * Returns the minimum planner start date allowed by the desktop app.
 * @returns Local day key for today.
 */
export function minimumPlannerStartDate(): string {
    return todayDayKey();
}

/**
 * Clamps planner start dates to today's local day key and fills blanks with
 * that same default.
 * @param value - Raw start-date value from settings or DOM.
 * @param minimumDate - Minimum allowed planner start date.
 * @returns Normalized planner start date.
 */
export function normalizePlannerStartDate(
    value: unknown,
    minimumDate = minimumPlannerStartDate(),
): string {
    if (typeof value !== "string") {
        return minimumDate;
    }
    const NORMALIZED = value.trim();
    if (NORMALIZED === "") {
        return minimumDate;
    }
    if (Number.isNaN(Date.parse(NORMALIZED))) {
        return minimumDate;
    }
    if (NORMALIZED < minimumDate) {
        return minimumDate;
    }
    return NORMALIZED;
}
