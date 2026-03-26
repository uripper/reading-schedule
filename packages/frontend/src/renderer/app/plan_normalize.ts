/**
 * Normalizes planner request dates and solver-token selection for desktop plan
 * generation.
 */
/**
 * Resolves the effective planner start date, defaulting and clamping to the
 * provided minimum date.
 * @param startDateRaw - Raw start-date value from settings.
 * @param minimumStartDate - Minimum allowed planner start date.
 * @returns Effective planner start date.
 */
export function normalizePlannerStartDate(
    startDateRaw: unknown,
    minimumStartDate: string,
): string {
    if (typeof startDateRaw !== "string") {
        return minimumStartDate;
    }
    const NORMALIZED_START_DATE = startDateRaw.trim();
    if (NORMALIZED_START_DATE === "") {
        return minimumStartDate;
    }
    if (Number.isNaN(Date.parse(NORMALIZED_START_DATE))) {
        return minimumStartDate;
    }
    if (NORMALIZED_START_DATE < minimumStartDate) {
        return minimumStartDate;
    }
    return NORMALIZED_START_DATE;
}

/**
 * Normalizes the end date by ensuring it is valid and not before the start
 * date.
 * @param endDate - The end date to normalize.
 * @param startDate - The start date to compare against.
 * @returns A normalized end date string or undefined if the input is invalid.
 */
export function normalizePlannerEndDate(
    endDate: unknown,
    startDate: string,
): string | undefined {
    if (typeof endDate !== "string" || !endDate) {
        return undefined;
    }
    const NORMALIZED_END_DATE = endDate.trim();
    if (NORMALIZED_END_DATE === "") {
        return undefined;
    }
    if (NORMALIZED_END_DATE < startDate) {
        return startDate;
    }
    return NORMALIZED_END_DATE;
}
