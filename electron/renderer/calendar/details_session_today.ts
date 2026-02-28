import {
    type CalendarRowWithFinish,
    type CalendarStateSubset,
    type DetailInteractionHandlers,
} from "../../types/types.js";
import { fallbackBookForRow } from "./details_fallback_book.js";
import { minutesFormForSession } from "./details_minutes_form.js";
import { progressFormForToday } from "./details_progress_form.js";
import {
    baseSessionItem,
    COMPLETE_ITEM_CLASS,
    COMPLETE_TOGGLE_LABEL,
    DAY_DETAILS_META_CLASS,
    removeSessionButton,
} from "./details_session_shared.js";
import { estimateProgressLabel } from "./estimates.js";
import { sessionKeyFor } from "./utils.js";

/**
 * Builds details row node for today sessions with progress and completion UX.
 * @param row Calendar row.
 * @param state Calendar state subset.
 * @param interactionHandlers Detail interaction handlers.
 * @param rerenderDetails Details rerender callback.
 * @returns Rendered row element.
 */
export function buildTodaySessionItem(
    row: CalendarRowWithFinish,
    state: CalendarStateSubset,
    interactionHandlers: DetailInteractionHandlers,
    rerenderDetails: () => void,
): HTMLElement {
    const IS_SESSION_COMPLETED = (session: string): boolean => {
        return interactionHandlers.isSessionCompleted(session);
    };
    const GET_BOOK_BY_ID = (
        bookId: string,
    ): ReturnType<DetailInteractionHandlers["getBookById"]> => {
        return interactionHandlers.getBookById(bookId);
    };
    const ITEM = baseSessionItem(row);
    const SESSION_KEY = sessionKeyFor(row);
    const COMPLETE_LABEL = document.createElement("label");
    COMPLETE_LABEL.className = "day-complete-toggle";
    const COMPLETE_INPUT = document.createElement("input");
    COMPLETE_INPUT.type = "checkbox";
    COMPLETE_INPUT.checked = Boolean(IS_SESSION_COMPLETED(SESSION_KEY));
    COMPLETE_LABEL.append(COMPLETE_INPUT, COMPLETE_TOGGLE_LABEL);
    ITEM.classList.toggle(COMPLETE_ITEM_CLASS, COMPLETE_INPUT.checked);
    COMPLETE_INPUT.onchange = () => {
        const CHECKED = Boolean(COMPLETE_INPUT.checked);
        ITEM.classList.toggle(COMPLETE_ITEM_CLASS, CHECKED);
        interactionHandlers.onSessionCompletionChanged({
            completed: CHECKED,
            row,
            sessionKey: SESSION_KEY,
        });
        rerenderDetails();
    };
    const MARK_COMPLETE_FROM_PROGRESS_UPDATE = (): void => {
        if (COMPLETE_INPUT.checked) {
            return;
        }
        COMPLETE_INPUT.checked = true;
        ITEM.classList.add(COMPLETE_ITEM_CLASS);
        interactionHandlers.onSessionCompletionChanged({
            completed: true,
            row,
            sessionKey: SESSION_KEY,
        });
        rerenderDetails();
    };
    const ESTIMATE = document.createElement("p");
    ESTIMATE.className = DAY_DETAILS_META_CLASS;
    ESTIMATE.textContent = estimateProgressLabel(
        row,
        state,
        GET_BOOK_BY_ID,
        IS_SESSION_COMPLETED,
    );
    const INCLUDE_ESTIMATE = !IS_SESSION_COMPLETED(SESSION_KEY);
    const BOOK = GET_BOOK_BY_ID(row.book_id) ?? fallbackBookForRow(row);
    ITEM.append(COMPLETE_LABEL);
    ITEM.append(
        minutesFormForSession(row, interactionHandlers, rerenderDetails),
    );
    ITEM.append(
        progressFormForToday(
            row,
            BOOK,
            interactionHandlers,
            MARK_COMPLETE_FROM_PROGRESS_UPDATE,
        ),
    );
    if (INCLUDE_ESTIMATE) {
        ITEM.append(ESTIMATE);
    }
    ITEM.append(removeSessionButton(row, interactionHandlers, rerenderDetails));
    return ITEM;
}
