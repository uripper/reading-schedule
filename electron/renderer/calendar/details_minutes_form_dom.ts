import { type CalendarRowWithFinish } from "../../types/types.js";
import { minPlannedMinutes } from "./details_minutes_form_helpers.js";

const PLANNED_MINUTES_PLACEHOLDER = "Planned minutes";
const SAVE_MINUTES_BUTTON_LABEL = "Save minutes";
const CANCEL_MINUTES_BUTTON_LABEL = "Cancel";

/**
 * Builds planned-minutes numeric input prefilled from row data.
 * @param row Calendar row being edited.
 * @returns Minutes input element.
 */
export function minutesInputForRow(
    row: CalendarRowWithFinish,
): HTMLInputElement {
    const MINUTES_INPUT = document.createElement("input");
    const MIN_MINUTES = minPlannedMinutes();
    MINUTES_INPUT.type = "number";
    MINUTES_INPUT.min = String(MIN_MINUTES);
    MINUTES_INPUT.step = "1";
    MINUTES_INPUT.placeholder = PLANNED_MINUTES_PLACEHOLDER;
    MINUTES_INPUT.value = String(Math.max(MIN_MINUTES, Number(row.minutes)));
    return MINUTES_INPUT;
}

/**
 * Builds minutes form action row with save/cancel buttons.
 * @returns Action container and cancel button reference.
 */
export function minutesFormActions(): {
    actions: HTMLDivElement;
    cancelBtn: HTMLButtonElement;
} {
    const SAVE_BTN = document.createElement("button");
    SAVE_BTN.type = "submit";
    SAVE_BTN.className = "btn";
    SAVE_BTN.textContent = SAVE_MINUTES_BUTTON_LABEL;
    const CANCEL_BTN = document.createElement("button");
    CANCEL_BTN.type = "button";
    CANCEL_BTN.className = "btn";
    CANCEL_BTN.textContent = CANCEL_MINUTES_BUTTON_LABEL;
    const ACTIONS = document.createElement("div");
    ACTIONS.className = "row";
    ACTIONS.append(SAVE_BTN, CANCEL_BTN);
    return { actions: ACTIONS, cancelBtn: CANCEL_BTN };
}
