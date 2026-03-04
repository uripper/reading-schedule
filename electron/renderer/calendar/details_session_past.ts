import type {
    CalendarRowWithFinish,
    DetailInteractionHandlers,
} from "../../types/types.js";
import { minutesFormForSession } from "./details_minutes_form.js";
import {
    baseSessionItem,
    COMPLETE_ITEM_CLASS,
    COMPLETE_TOGGLE_LABEL,
    DAY_DETAILS_META_CLASS,
    removeSessionButton,
} from "./details_session_shared.js";
import { sessionKeyFor } from "./utils.js";

const COMPLETED_TEXT = "Completed";
const NOT_COMPLETED_TEXT = "Not completed";

/**
 * Builds details row node for past sessions with completion toggle.
 * @param row Calendar row.
 * @param interactionHandlers Detail interaction handlers.
 * @param rerenderDetails Details rerender callback.
 * @returns Rendered row element.
 */
export function buildPastSessionItem(
    row: CalendarRowWithFinish,
    interactionHandlers: DetailInteractionHandlers,
    rerenderDetails: () => void,
): HTMLElement {
    const ITEM = baseSessionItem(row);
    const SESSION_KEY = sessionKeyFor(row);
    const COMPLETE_LABEL = document.createElement("label");
    COMPLETE_LABEL.className = "day-complete-toggle";
    const COMPLETE_INPUT = document.createElement("input");
    COMPLETE_INPUT.type = "checkbox";
    COMPLETE_INPUT.checked = Boolean(
        interactionHandlers.isSessionCompleted(SESSION_KEY),
    );
    COMPLETE_LABEL.append(COMPLETE_INPUT, COMPLETE_TOGGLE_LABEL);
    const STATUS = document.createElement("p");
    STATUS.className = DAY_DETAILS_META_CLASS;
    if (COMPLETE_INPUT.checked) {
        STATUS.textContent = COMPLETED_TEXT;
    } else {
        STATUS.textContent = NOT_COMPLETED_TEXT;
    }
    ITEM.classList.toggle(COMPLETE_ITEM_CLASS, COMPLETE_INPUT.checked);
    COMPLETE_INPUT.onchange = () => {
        const CHECKED = Boolean(COMPLETE_INPUT.checked);
        ITEM.classList.toggle(COMPLETE_ITEM_CLASS, CHECKED);
        if (CHECKED) {
            STATUS.textContent = COMPLETED_TEXT;
        } else {
            STATUS.textContent = NOT_COMPLETED_TEXT;
        }
        interactionHandlers.onSessionCompletionChanged({
            completed: CHECKED,
            row,
            sessionKey: SESSION_KEY,
        });
        rerenderDetails();
    };
    ITEM.append(
        COMPLETE_LABEL,
        STATUS,
        minutesFormForSession(row, interactionHandlers, rerenderDetails),
        removeSessionButton(row, interactionHandlers, rerenderDetails),
    );
    return ITEM;
}
