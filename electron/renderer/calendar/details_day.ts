import type {
    CalendarRowWithFinish,
    DayMode,
    DetailInteractionHandlers,
} from "../../types/types.js";
import { compareDayKeys } from "../app/day_keys_compare.js";
import { rowsWithFinishFirst } from "./data.js";
import { sessionKeyFor } from "./utils.js";

/**
 * Creates a local date key (`YYYY-MM-DD`) for the current day.
 * @returns Date key for "today" in local time.
 */
function todayDateKey(): string {
    const NOW = new Date();
    const YEAR = NOW.getFullYear();
    const MONTH = String(NOW.getMonth() + 1).padStart(2, "0");
    const DAY = String(NOW.getDate()).padStart(2, "0");
    return `${YEAR}-${MONTH}-${DAY}`;
}

/**
 * Categorizes a date relative to today for day-detail UI behavior.
 * @param dateKey Day key in `YYYY-MM-DD` format.
 * @returns Whether the day is in the past, today, or future.
 */
export function dayMode(dateKey: string): DayMode {
    const TODAY = todayDateKey();
    const COMPARED = compareDayKeys(dateKey, TODAY);
    if (COMPARED === null) {
        return "today";
    }
    if (COMPARED < 0) {
        return "past";
    }
    if (COMPARED > 0) {
        return "future";
    }
    return "today";
}

/**
 * Sorts rows with unfinished sessions first and completed sessions last.
 * @param rows Rows for a single day before completion-based ordering.
 * @param interactionHandlers Completion lookup handlers for session rows.
 * @returns Rows grouped by completion state, with finish-priority sorting in each group.
 */
export function rowsWithCompletedLast(
    rows: CalendarRowWithFinish[],
    interactionHandlers: DetailInteractionHandlers,
): CalendarRowWithFinish[] {
    const INCOMPLETE_ROWS: CalendarRowWithFinish[] = [];
    const COMPLETE_ROWS: CalendarRowWithFinish[] = [];

    for (const ROW of rows) {
        const COMPLETE = Boolean(
            interactionHandlers.isSessionCompleted(sessionKeyFor(ROW)),
        );
        if (COMPLETE) {
            COMPLETE_ROWS.push(ROW);
            continue;
        }
        INCOMPLETE_ROWS.push(ROW);
    }
    return [
        ...rowsWithFinishFirst(INCOMPLETE_ROWS),
        ...rowsWithFinishFirst(COMPLETE_ROWS),
    ];
}
