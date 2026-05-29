/**
 * Footer controls for range-capable date pickers.
 */
import type { Instance } from "flatpickr/dist/types/instance";

const DONE_BUTTON_CLASS = "date-picker-range-done";
const DONE_BUTTON_LABEL = "Done";
const FOOTER_CLASS = "date-picker-range-footer";
const RANGE_PICKER_CLASS = "date-picker-range";

type RangePickerFooterInstance = Pick<Instance, "calendarContainer" | "close">;

function existingFooter(calendar: HTMLElement): HTMLElement | null {
    return calendar.querySelector<HTMLElement>(`.${FOOTER_CLASS}`);
}

function doneButton(picker: RangePickerFooterInstance): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.className = `btn ${DONE_BUTTON_CLASS}`;
    BUTTON.type = "button";
    BUTTON.textContent = DONE_BUTTON_LABEL;
    BUTTON.addEventListener("click", () => {
        picker.close();
    });
    return BUTTON;
}

/**
 * Adds a Done action so an incomplete range can be accepted as one date.
 * @param picker - Flatpickr instance receiving range footer controls.
 */
export function attachRangePickerFooter(
    picker: RangePickerFooterInstance,
): void {
    const CALENDAR = picker.calendarContainer;
    CALENDAR.classList.add(RANGE_PICKER_CLASS);
    if (existingFooter(CALENDAR) !== null) {
        return;
    }
    const FOOTER = document.createElement("div");
    FOOTER.className = FOOTER_CLASS;
    FOOTER.append(doneButton(picker));
    CALENDAR.append(FOOTER);
}
