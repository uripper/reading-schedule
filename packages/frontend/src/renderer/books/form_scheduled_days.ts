/**
 * Scheduled-day toggles in the book form. Each weekday is a toggle button
 * whose `aria-pressed` state is the source of truth; toggling dispatches a
 * bubbling `change` so mass edit can mark the field dirty.
 */
import type { BookFormRefs, BookWeekday } from "../../types/types.ts";
import {
    BOOK_WEEKDAYS,
    isBookWeekday,
    normalizeScheduledDays,
} from "./scheduled_days.ts";

/** Class shared by every weekday toggle button. */
export const SCHEDULED_DAY_CLASS = "book-scheduled-day";
const PRESSED_ATTR = "aria-pressed";

/**
 * Returns the weekday toggle buttons from the form.
 * @param refs - Book form references containing the scheduled-days field.
 * @returns Toggle buttons for every weekday.
 */
export function scheduledDayButtons(refs: BookFormRefs): HTMLButtonElement[] {
    return Array.from(
        refs.scheduledDaysField.querySelectorAll<HTMLButtonElement>(
            `.${SCHEDULED_DAY_CLASS}`,
        ),
    );
}

/**
 * Reads whether a weekday toggle is on.
 * @param button - Weekday toggle.
 * @returns `true` when pressed.
 */
function isPressed(button: HTMLButtonElement): boolean {
    return button.getAttribute(PRESSED_ATTR) === "true";
}

/**
 * Turns a weekday toggle on or off.
 * @param button - Weekday toggle.
 * @param pressed - New state.
 */
function setPressed(button: HTMLButtonElement, pressed: boolean): void {
    button.setAttribute(PRESSED_ATTR, String(pressed));
}

/**
 * Reads the weekday a toggle stands for.
 * @param button - Weekday toggle.
 * @returns Weekday key, or `null` when the value is unknown.
 */
function selectedWeekday(button: HTMLButtonElement): BookWeekday | null {
    const VALUE = String(button.value || "").trim();
    if (isBookWeekday(VALUE)) {
        return VALUE;
    }
    return null;
}

/**
 * Resets scheduled-day controls to "all weekdays selected".
 * @param refs - Book form references containing scheduled-day controls.
 */
export function resetScheduledDayControls(refs: BookFormRefs): void {
    const FORM_REFS = refs;
    for (const BUTTON of scheduledDayButtons(FORM_REFS)) {
        setPressed(BUTTON, true);
    }
    FORM_REFS.applyScheduledDaysToShelfInput.checked = false;
}

/**
 * Applies normalized scheduled days to the weekday toggles.
 * @param refs - Book form references containing scheduled-day controls.
 * @param days - Scheduled-day values from a book model.
 */
export function fillScheduledDayControls(
    refs: BookFormRefs,
    days: unknown,
): void {
    const FORM_REFS = refs;
    const SELECTED = new Set<BookWeekday>(normalizeScheduledDays(days));
    for (const BUTTON of scheduledDayButtons(FORM_REFS)) {
        const WEEKDAY = selectedWeekday(BUTTON);
        setPressed(BUTTON, WEEKDAY !== null && SELECTED.has(WEEKDAY));
    }
    FORM_REFS.applyScheduledDaysToShelfInput.checked = false;
}

/**
 * Reads the weekdays switched on.
 * @param refs - Book form references containing scheduled-day controls.
 * @returns Ordered weekday keys selected by the user.
 */
export function readScheduledDaySelection(refs: BookFormRefs): BookWeekday[] {
    const SELECTED = new Set<BookWeekday>();
    for (const BUTTON of scheduledDayButtons(refs)) {
        const WEEKDAY = selectedWeekday(BUTTON);
        if (WEEKDAY !== null && isPressed(BUTTON)) {
            SELECTED.add(WEEKDAY);
        }
    }
    return BOOK_WEEKDAYS.filter((weekday) => SELECTED.has(weekday));
}

/**
 * Toggles a weekday when its button is clicked.
 * @param refs - Book form references containing scheduled-day controls.
 */
export function bindScheduledDayToggles(refs: BookFormRefs): void {
    refs.scheduledDaysField.addEventListener("click", (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }
        const BUTTON = event.target.closest<HTMLButtonElement>(
            `.${SCHEDULED_DAY_CLASS}`,
        );
        if (BUTTON === null) {
            return;
        }
        setPressed(BUTTON, !isPressed(BUTTON));
        BUTTON.dispatchEvent(new Event("change", { bubbles: true }));
    });
}
