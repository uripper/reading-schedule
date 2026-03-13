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

/**
 * Builds details row node for future sessions.
 * @param row - Calendar row.
 * @param state - Calendar state subset.
 * @param interactionHandlers - Detail interaction handlers.
 * @param rerenderDetails - Details rerender callback.
 * @returns Rendered row element.
 */
export function buildFutureSessionItem(
    row: CalendarRowWithFinish,
    state: CalendarStateSubset,
    interactionHandlers: DetailInteractionHandlers,
    rerenderDetails: () => void,
): HTMLElement {
    const GET_BOOK_BY_ID = (
        bookId: string,
    ): ReturnType<DetailInteractionHandlers["getBookById"]> => {
        return interactionHandlers.getBookById(bookId);
    };
    const IS_SESSION_COMPLETED = (sessionKey: string): boolean => {
        return interactionHandlers.isSessionCompleted(sessionKey);
    };
    const ITEM = baseSessionItem(row);
    const ESTIMATE = document.createElement("p");
    ESTIMATE.className = DAY_DETAILS_META_CLASS;
    ESTIMATE.textContent = estimateProgressLabel(
        row,
        state,
        GET_BOOK_BY_ID,
        IS_SESSION_COMPLETED,
    );
    ITEM.append(
        ESTIMATE,
        minutesFormForSession(row, interactionHandlers, rerenderDetails),
        removeSessionButton(row, interactionHandlers, rerenderDetails),
    );
    return ITEM;
}
