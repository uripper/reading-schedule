import type {
    CalendarRowWithFinish,
    DayMode,
    DetailInteractionHandlers,
} from "@reading-schedule/contracts";
import { rowsWithFinishFirst } from "./data.ts";
import { rowsWithCompletedLast } from "./details_helpers.ts";

/**
 * Returns empty-state message for day details panel by mode.
 * @param _mode - Day mode.
 * @returns Empty-state message.
 */
export function emptyMessageForMode(_mode: DayMode): string {
    return "No sessions planned for this day.";
}

/**
 * Selects row ordering strategy for details mode.
 * @param rows - Day rows.
 * @param mode -Day mode.
 * @param interactionHandlers - Detail interaction handlers.
 * @returns Rows ordered for display.
 */
export function rowsForMode(
    rows: CalendarRowWithFinish[],
    mode: DayMode,
    interactionHandlers: DetailInteractionHandlers,
): CalendarRowWithFinish[] {
    if (mode === "past") {
        return rowsWithCompletedLast(rows, interactionHandlers);
    }
    if (mode === "today") {
        return rowsWithCompletedLast(rows, interactionHandlers);
    }
    return rowsWithFinishFirst(rows);
}
