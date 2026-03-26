/**
 * Selects and applies per-mode session item builders for calendar day details.
 */
import type {
    CalendarDetailsState,
    CalendarRowWithFinish,
    DayMode,
    DetailInteractionHandlers,
} from "../../types/types.ts";
import { buildFutureSessionItem } from "./details_session_future.ts";
import { buildPastSessionItem } from "./details_session_past.ts";
import type { BuildTodaySessionItemArgs } from "./details_session_today.ts";
import { buildTodaySessionItem } from "./details_session_today.ts";

/**
 * Session-item builder implementations grouped by calendar day mode.
 */
interface DetailsItemBuilders<TNode> {
    future(args: {
        row: CalendarRowWithFinish;
        state: CalendarDetailsState;
        interactionHandlers: DetailInteractionHandlers;
        rerenderDetails: () => void;
    }): TNode;
    past(
        row: CalendarRowWithFinish,
        interactionHandlers: DetailInteractionHandlers,
        rerenderDetails: () => void,
    ): TNode;
    today(args: BuildTodaySessionItemArgs): TNode;
}

interface BuildSessionItemsArgs<TNode> {
    builders: DetailsItemBuilders<TNode>;
    interactionHandlers: DetailInteractionHandlers;
    mode: DayMode;
    rerenderDetails: () => void;
    rows: CalendarRowWithFinish[];
    state: CalendarDetailsState;
}

function buildPastItems<TNode>(args: BuildSessionItemsArgs<TNode>): TNode[] {
    return args.rows.map((row) => {
        return args.builders.past(
            row,
            args.interactionHandlers,
            args.rerenderDetails,
        );
    });
}

function buildTodayItems<TNode>(args: BuildSessionItemsArgs<TNode>): TNode[] {
    return args.rows.map((row) => {
        return args.builders.today({
            interactionHandlers: args.interactionHandlers,
            rerenderDetails: args.rerenderDetails,
            row,
            state: args.state,
        });
    });
}

function buildFutureItems<TNode>(args: BuildSessionItemsArgs<TNode>): TNode[] {
    return args.rows.map((row) => {
        return args.builders.future({
            interactionHandlers: args.interactionHandlers,
            rerenderDetails: args.rerenderDetails,
            row,
            state: args.state,
        });
    });
}

/**
 * Builds detail-row nodes for the selected day using the correct per-mode
 * renderer for each schedule row.
 * @param args - Day-mode dispatch inputs and renderer callbacks.
 * @returns Rendered session item nodes in display order.
 */
export function buildSessionItemsForMode<TNode>(
    args: BuildSessionItemsArgs<TNode>,
): TNode[] {
    if (args.mode === "past") {
        return buildPastItems(args);
    }
    if (args.mode === "today") {
        return buildTodayItems(args);
    }
    return buildFutureItems(args);
}

/**
 * Default HTMLElement builders used by the live calendar details renderer.
 */
export const DEFAULT_DETAILS_ITEM_BUILDERS: DetailsItemBuilders<HTMLElement> = {
    future: buildFutureSessionItem,
    past: buildPastSessionItem,
    today: buildTodaySessionItem,
};
