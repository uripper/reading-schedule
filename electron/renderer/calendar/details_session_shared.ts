import {
    type CalendarRowWithFinish,
    type DetailInteractionHandlers,
} from "../../types/types.js";

export const DAY_DETAILS_META_CLASS = "day-details-meta";
export const COMPLETE_ITEM_CLASS = "is-complete";
export const COMPLETE_TOGGLE_LABEL = " Complete session";
const REMOVE_SESSION_LABEL = "Remove session";

/**
 * Builds common base session item node used across day modes.
 * @param row Calendar row.
 * @returns Base session item element.
 */
export function baseSessionItem(row: CalendarRowWithFinish): HTMLElement {
    const ITEM = document.createElement("article");
    ITEM.className = "day-details-item";
    if (row.finish) {
        ITEM.classList.add("is-finish");
    }
    const HEAD = document.createElement("strong");
    HEAD.className = "day-session-title";
    HEAD.textContent = row.title;
    if (row.finish) {
        const FINISH_BADGE = document.createElement("span");
        FINISH_BADGE.className = "day-finish-badge";
        FINISH_BADGE.textContent = "Expected finish";
        ITEM.append(HEAD, FINISH_BADGE);
    } else {
        ITEM.append(HEAD);
    }
    return ITEM;
}

/**
 * Builds remove-session button with confirmation and callback wiring.
 * @param row Calendar row.
 * @param interactionHandlers Detail interaction handlers.
 * @param rerenderDetails Details rerender callback.
 * @returns Remove button element.
 */
export function removeSessionButton(
    row: CalendarRowWithFinish,
    interactionHandlers: DetailInteractionHandlers,
    rerenderDetails: () => void,
): HTMLButtonElement {
    const REMOVE_BUTTON = document.createElement("button");
    REMOVE_BUTTON.type = "button";
    REMOVE_BUTTON.className = "btn-session-remove";
    REMOVE_BUTTON.textContent = "x";
    REMOVE_BUTTON.setAttribute("aria-label", REMOVE_SESSION_LABEL);
    REMOVE_BUTTON.title = REMOVE_SESSION_LABEL;
    REMOVE_BUTTON.onclick = () => {
        const REMOVED = interactionHandlers.onSessionRemoved({ row });
        if (!REMOVED) {
            return;
        }
        rerenderDetails();
    };
    return REMOVE_BUTTON;
}
