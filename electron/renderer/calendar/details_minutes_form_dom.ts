import type { CalendarRowWithFinish } from "../../types/types.js";
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
    const minutesInput = document.createElement("input");
    const minMinutes = minPlannedMinutes();
    minutesInput.type = "number";
    minutesInput.min = String(minMinutes);
    minutesInput.step = "1";
    minutesInput.placeholder = PLANNED_MINUTES_PLACEHOLDER;
    minutesInput.value = String(Math.max(minMinutes, Number(row.minutes)));
    return minutesInput;
}

/**
 * Builds minutes form action row with save/cancel buttons.
 * @returns Action container and cancel button reference.
 */
export function minutesFormActions(): {
    actions: HTMLDivElement;
    cancelBtn: HTMLButtonElement;
} {
    const saveBtn = document.createElement("button");
    saveBtn.type = "submit";
    saveBtn.className = "btn";
    saveBtn.textContent = SAVE_MINUTES_BUTTON_LABEL;
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn";
    cancelBtn.textContent = CANCEL_MINUTES_BUTTON_LABEL;
    const actions = document.createElement("div");
    actions.className = "row";
    actions.append(saveBtn, cancelBtn);
    return { actions, cancelBtn };
}
