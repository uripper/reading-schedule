import type { CalendarRowWithFinish } from "./data.js";
import type { DetailInteractionHandlers } from "./details_types.js";
import { parseOptionalNumber } from "./utils.js";

/**
 * Prefills input value from book progress value when present.
 * @param inputNode Input element to set.
 * @param value Optional source value.
 */
export function setInputValueFromBookProgress(
  inputNode: HTMLInputElement,
  value?: string | number,
): void {
  if (value !== null && value !== undefined) {
    inputNode.value = String(value);
  }
}

/**
 * Parses changed numeric value from input relative to initial text.
 * @param inputNode Input element.
 * @param initialValue Initial value text.
 * @returns Parsed number or `null` when unchanged/invalid.
 */
function changedNumberValue(
  inputNode: HTMLInputElement,
  initialValue: string,
): number | null {
  const currentValue = String(inputNode.value ?? "").trim();
  if (currentValue === String(initialValue)) {
    return null;
  }
  return parseOptionalNumber(currentValue);
}

/**
 * Syncs input element to provided numeric value when present.
 * @param inputNode Input element.
 * @param nextValue Optional value to write.
 * @returns Current trimmed input value after sync.
 */
function syncInputValue(
  inputNode: HTMLInputElement,
  nextValue?: number | null,
): string {
  if (nextValue === null || nextValue === undefined) {
    return String(inputNode.value ?? "").trim();
  }
  inputNode.value = String(nextValue);
  return String(inputNode.value ?? "").trim();
}

/**
 * Submits progress update and returns updated baseline form values.
 * @param event Form submit event.
 * @param row Calendar row being edited.
 * @param pagesInput Pages-read input element.
 * @param pctInput Progress-percent input element.
 * @param initialPagesValue Previous stable pages value.
 * @param initialPercentValue Previous stable percent value.
 * @param interactionHandlers Detail interaction handlers.
 * @returns Updated initial values and apply status.
 */
export function submitProgressUpdate(
  event: SubmitEvent,
  row: CalendarRowWithFinish,
  pagesInput: HTMLInputElement,
  pctInput: HTMLInputElement,
  initialPagesValue: string,
  initialPercentValue: string,
  interactionHandlers: DetailInteractionHandlers,
): {
  initialPagesValue: string;
  initialPercentValue: string;
  applied: boolean;
} {
  event.preventDefault();
  const pagesRead = changedNumberValue(pagesInput, initialPagesValue);
  const progressPercent = changedNumberValue(pctInput, initialPercentValue);
  if (pagesRead === null && progressPercent === null) {
    return { initialPagesValue, initialPercentValue, applied: true };
  }

  const updated = interactionHandlers.onSessionProgressUpdated({
    bookId: row.book_id,
    pagesRead,
    progressPercent,
    row,
  });
  if (!updated) {
    return { initialPagesValue, initialPercentValue, applied: false };
  }

  return {
    initialPagesValue: syncInputValue(pagesInput, updated.pages_read),
    initialPercentValue: syncInputValue(pctInput, updated.progress_percent),
    applied: true,
  };
}
