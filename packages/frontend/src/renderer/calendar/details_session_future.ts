import type {
    CalendarRowWithFinish,
    CalendarStateSubset,
    DetailInteractionHandlers,
} from "../../types/types.ts";
import { minutesFormForSession } from "./details_minutes_form.ts";
import {
    baseSessionItem,
    DAY_DETAILS_META_CLASS,
    removeSessionButton,
} from "./details_session_shared.ts";
import { estimateProgressLabel } from "./estimates.ts";

type BuildFutureSessionItemArgs = {
    row: CalendarRowWithFinish;
    state: CalendarStateSubset;
    interactionHandlers: DetailInteractionHandlers;
    rerenderDetails: () => void;
};

function futureEstimateText(args: BuildFutureSessionItemArgs): string {
    return estimateProgressLabel({
        getBookById: args.interactionHandlers.getBookById,
        isSessionCompleted: args.interactionHandlers.isSessionCompleted,
        row: args.row,
        state: args.state,
    });
}

function futureEstimateElement(
    args: BuildFutureSessionItemArgs,
): HTMLParagraphElement {
    const ESTIMATE = document.createElement("p");
    ESTIMATE.className = `${DAY_DETAILS_META_CLASS} day-session-estimate`;
    ESTIMATE.textContent = futureEstimateText(args);
    return ESTIMATE;
}

/**
 * Builds details row node for future sessions.
 * @param args - Future-session render inputs.
 * @returns Rendered row element.
 */
export function buildFutureSessionItem(
    args: BuildFutureSessionItemArgs,
): HTMLElement {
    const ITEM = baseSessionItem(args.row);
    ITEM.append(
        futureEstimateElement(args),
        minutesFormForSession(
            args.row,
            args.interactionHandlers,
            args.rerenderDetails,
        ),
        removeSessionButton(
            args.row,
            args.interactionHandlers,
            args.rerenderDetails,
        ),
    );
    return ITEM;
}
