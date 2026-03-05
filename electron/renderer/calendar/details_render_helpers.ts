import type {
    CalendarRowWithFinish,
    DayMode,
    DetailInteractionHandlers,
    RowNodeForModeArgs,
} from "../../types/types.js";
import { rowsWithFinishFirst } from "./data.js";
import {
    buildFutureSessionItem,
    buildPastSessionItem,
    buildTodaySessionItem,
    rowsWithCompletedLast,
} from "./details_helpers.js";

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

/**
 * Builds the proper row node for current day mode.
 * @param args - Row rendering payload for the active day mode.
 * args.mode - Day mode.
 * args.row - Calendar row.
 * args.state - Calendar details state.
 * args.interactionHandlers - Detail interaction handlers.
 * args.rerenderDetails - Details rerender callback.
 * @returns Rendered row element.
 */
export function rowNodeForMode(args: RowNodeForModeArgs): HTMLElement {
    const RERENDER_DETAILS = (): void => {
        args.rerenderDetails();
    };
    if (args.mode === "today") {
        return buildTodaySessionItem(
            args.row,
            args.state,
            args.interactionHandlers,
            RERENDER_DETAILS,
        );
    }
    if (args.mode === "future") {
        return buildFutureSessionItem(
            args.row,
            args.state,
            args.interactionHandlers,
            RERENDER_DETAILS,
        );
    }
    return buildPastSessionItem(
        args.row,
        args.interactionHandlers,
        RERENDER_DETAILS,
    );
}
