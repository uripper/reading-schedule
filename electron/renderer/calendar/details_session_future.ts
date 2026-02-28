import {
    type CalendarRowWithFinish,
    type CalendarStateSubset,
    type DetailInteractionHandlers,
} from "../../types/types.js";
import { minutesFormForSession } from "./details_minutes_form.js";
import {
    baseSessionItem,
    DAY_DETAILS_META_CLASS,
    removeSessionButton,
} from "./details_session_shared.js";
import { estimateProgressLabel } from "./estimates.js";

/**
 * Builds details row node for future sessions.
 * @param row Calendar row.
 * @param state Calendar state subset.
 * @param interactionHandlers Detail interaction handlers.
 * @param rerenderDetails Details rerender callback.
 * @returns Rendered row element.
 */
export function buildFutureSessionItem(
    row: CalendarRowWithFinish,
    state: CalendarStateSubset,
    interactionHandlers: DetailInteractionHandlers,
    rerenderDetails: () => void,
): HTMLElement {
    const getBookById = (
        bookId: string,
    ): ReturnType<DetailInteractionHandlers["getBookById"]> => {
        return interactionHandlers.getBookById(bookId);
    };
    const isSessionCompleted = (sessionKey: string): boolean => {
        return interactionHandlers.isSessionCompleted(sessionKey);
    };
    const item = baseSessionItem(row);
    const estimate = document.createElement("p");
    estimate.className = DAY_DETAILS_META_CLASS;
    estimate.textContent = estimateProgressLabel(
        row,
        state,
        getBookById,
        isSessionCompleted,
    );
    item.append(
        estimate,
        minutesFormForSession(row, interactionHandlers, rerenderDetails),
        removeSessionButton(row, interactionHandlers, rerenderDetails),
    );
    return item;
}
