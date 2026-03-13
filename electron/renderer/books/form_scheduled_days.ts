import type { BookFormRefs, BookWeekday } from "../../types/types.ts";
import {
    BOOK_WEEKDAYS,
    isBookWeekday,
    normalizeScheduledDays,
} from "./scheduled_days.ts";

const SCHEDULED_DAY_SELECTOR = 'input[type="checkbox"][data-book-weekday]';

/**
 * Returns scheduled-day checkbox inputs from the form.
 * @param refs - Book form references containing the scheduled-days field.
 * @returns Checkbox inputs for all weekday options.
 */
function scheduledDayInputs(refs: BookFormRefs): HTMLInputElement[] {
    return Array.from(
        refs.scheduledDaysField.querySelectorAll<HTMLInputElement>(
            SCHEDULED_DAY_SELECTOR,
        ),
    );
}

/**
 * Resets scheduled-day controls to "all weekdays selected".
 * @param refs - Book form references containing scheduled-day controls.
 */
export function resetScheduledDayControls(refs: BookFormRefs): void {
    const FORM_REFS = refs;
    for (const INPUT of scheduledDayInputs(FORM_REFS)) {
        INPUT.checked = true;
    }
    FORM_REFS.applyScheduledDaysToShelfInput.checked = false;
}

/**
 * Applies normalized scheduled days to weekday checkboxes.
 * @param refs - Book form references containing scheduled-day controls.
 * @param days - Scheduled-day values from a book model.
 */
export function fillScheduledDayControls(
    refs: BookFormRefs,
    days: unknown,
): void {
    const FORM_REFS = refs;
    const NORMALIZED = normalizeScheduledDays(days);
    const SELECTED = new Set<BookWeekday>(NORMALIZED);
    for (const INPUT of scheduledDayInputs(FORM_REFS)) {
        INPUT.checked = SELECTED.has(INPUT.value as BookWeekday);
    }
    FORM_REFS.applyScheduledDaysToShelfInput.checked = false;
}

/**
 * Reads selected weekday values from scheduled-day checkboxes.
 * @param refs - Book form references containing scheduled-day controls.
 * @returns Ordered weekday keys selected by the user.
 */
export function readScheduledDaySelection(refs: BookFormRefs): BookWeekday[] {
    const SELECTED = new Set<BookWeekday>();

    for (const INPUT of scheduledDayInputs(refs)) {
        if (!INPUT.checked) {
            continue;
        }
        const VALUE = String(INPUT.value || "").trim();
        if (isBookWeekday(VALUE)) {
            SELECTED.add(VALUE);
        }
    }
    return BOOK_WEEKDAYS.filter((weekday) => SELECTED.has(weekday));
}
