/**
 * Selects and applies per-mode session item builders for calendar day details.
 */
import type {
    CalendarDetailsState,
    CalendarRowWithFinish,
    DayMode,
    DetailInteractionHandlers,
} from "../../types/types.js";
import {
    buildFutureSessionItem,
    buildPastSessionItem,
    buildTodaySessionItem,
} from "./details_session_items.js";

// TODO: Move these detail-renderer contracts into `electron/types` when the
// calendar details modules are normalized.
/**
 * Session-item builder implementations grouped by calendar day mode.
 */
interface DetailsItemBuilders<TNode> {
    future(
        row: CalendarRowWithFinish,
        state: CalendarDetailsState,
        interactionHandlers: DetailInteractionHandlers,
        rerenderDetails: () => void,
    ): TNode;
    past(
        row: CalendarRowWithFinish,
        interactionHandlers: DetailInteractionHandlers,
        rerenderDetails: () => void,
    ): TNode;
    today(
        row: CalendarRowWithFinish,
        state: CalendarDetailsState,
        interactionHandlers: DetailInteractionHandlers,
        rerenderDetails: () => void,
    ): TNode;
}

// TODO: Move these detail-renderer contracts into `electron/types` when the
// calendar details modules are normalized.
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
        return args.builders.today(
            row,
            args.state,
            args.interactionHandlers,
            args.rerenderDetails,
        );
    });
}

function buildFutureItems<TNode>(args: BuildSessionItemsArgs<TNode>): TNode[] {
    return args.rows.map((row) => {
        return args.builders.future(
            row,
            args.state,
            args.interactionHandlers,
            args.rerenderDetails,
        );
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
