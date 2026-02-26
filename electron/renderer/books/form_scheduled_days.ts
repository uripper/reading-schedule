import {
  BOOK_WEEKDAYS,
  isBookWeekday,
  normalizeScheduledDays,
  type BookWeekday,
} from "./scheduled_days.js";
import type { BookFormRefs } from "./form_refs.js";

const SCHEDULED_DAY_SELECTOR = 'input[type="checkbox"][data-book-weekday]';

/**
 * Returns scheduled-day checkbox inputs from the form.
 * @param refs Book form references containing the scheduled-days field.
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
 * @param refs Book form references containing scheduled-day controls.
 */
export function resetScheduledDayControls(refs: BookFormRefs): void {
  scheduledDayInputs(refs).forEach((input) => {
    input.checked = true;
  });
  refs.applyScheduledDaysToShelfInput.checked = false;
}

/**
 * Applies normalized scheduled days to weekday checkboxes.
 * @param refs Book form references containing scheduled-day controls.
 * @param days Scheduled-day values from a book model.
 */
export function fillScheduledDayControls(
  refs: BookFormRefs,
  days: unknown,
): void {
  const normalized = normalizeScheduledDays(days);
  const selected = new Set<BookWeekday>(normalized);
  scheduledDayInputs(refs).forEach((input) => {
    input.checked = selected.has(input.value as BookWeekday);
  });
  refs.applyScheduledDaysToShelfInput.checked = false;
}

/**
 * Reads selected weekday values from scheduled-day checkboxes.
 * @param refs Book form references containing scheduled-day controls.
 * @returns Ordered weekday keys selected by the user.
 */
export function readScheduledDaySelection(refs: BookFormRefs): BookWeekday[] {
  const selected = new Set<BookWeekday>();
  scheduledDayInputs(refs).forEach((input) => {
    if (!input.checked) {
      return;
    }
    const value = String(input.value || "").trim();
    if (isBookWeekday(value)) {
      selected.add(value);
    }
  });
  return BOOK_WEEKDAYS.filter((weekday) => selected.has(weekday));
}
