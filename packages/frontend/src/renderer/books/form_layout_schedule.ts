/** Builds the book form's scheduled-day toggles and the shelf-wide option. */
import { SCHEDULED_DAY_CLASS } from "./form_scheduled_days.ts";
import { BOOK_WEEKDAYS } from "./scheduled_days.ts";

/**
 * Creates one weekday toggle: cream when off, accent with a check when on.
 * @param weekday - Weekday key shown on the button.
 * @returns Toggle button, on by default.
 */
function scheduledDayButton(weekday: string): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = `btn btn-compact ${SCHEDULED_DAY_CLASS}`;
    BUTTON.value = weekday;
    BUTTON.dataset.bookWeekday = weekday;
    BUTTON.setAttribute("aria-pressed", "true");
    const ICON = document.createElement("span");
    ICON.className = "icon icon-check book-scheduled-day-check";
    ICON.setAttribute("aria-hidden", "true");
    const TEXT = document.createElement("span");
    TEXT.textContent = weekday;
    BUTTON.append(ICON, TEXT);
    return BUTTON;
}

/**
 * Creates the scheduled-days fieldset with one toggle per weekday.
 * @returns Fieldset for choosing the book's reading days.
 */
export function createScheduledDaysField(): HTMLFieldSetElement {
    const FIELDSET = document.createElement("fieldset");
    FIELDSET.id = "bookScheduledDaysField";
    FIELDSET.className = "book-scheduled-days";
    const LEGEND = document.createElement("legend");
    LEGEND.textContent = "Scheduled Days";
    const DAYS = document.createElement("div");
    DAYS.className = "book-scheduled-days-grid";
    DAYS.append(...BOOK_WEEKDAYS.map(scheduledDayButton));
    FIELDSET.append(LEGEND, DAYS);
    return FIELDSET;
}

/**
 * Creates the toggle that applies weekday changes to same-shelf books. The
 * whole label row is clickable and the box is full size.
 * @returns Labeled checkbox for shelf-wide weekday propagation.
 */
export function createApplyScheduledDaysToShelfLabel(): HTMLLabelElement {
    const LABEL = document.createElement("label");
    LABEL.className = "toggle-row book-apply-days-toggle";
    const INPUT = document.createElement("input");
    INPUT.id = "bookApplyScheduledDaysToShelfInput";
    INPUT.type = "checkbox";
    const TEXT = document.createElement("span");
    TEXT.textContent = "Apply scheduled days to all books on this shelf";
    LABEL.append(INPUT, TEXT);
    return LABEL;
}
