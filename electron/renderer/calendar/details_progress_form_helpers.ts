

import { parseOptionalNumber } from "./utils.js";
import type { SubmitProgressUpdateArgs } from "../../types/types.js";

/**
 * Prefills input value from book progress value when present.
 * @param inputNode Input element to set.
 * @param value Optional source value.
 */
export function setInputValueFromBookProgress(
  inputNode: HTMLInputElement,
  value?: string | number,
): void {
  const targetInput = inputNode;
  if (value !== undefined) {
    targetInput.value = String(value);
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
  const currentValue = String(inputNode.value).trim();
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
  const targetInput = inputNode;
  if (nextValue === null || nextValue === undefined) {
    return String(targetInput.value).trim();
  }
  targetInput.value = String(nextValue);
  return String(targetInput.value).trim();
}

/**
 * Submits progress update and returns updated baseline form values.
 * @param args Form submission payload for the progress editor.
 * @param args.event Form submit event.
 * @param args.row Calendar row being edited.
 * @param args.pagesInput Pages-read input element.
 * @param args.pctInput Progress-percent input element.
 * @param args.initialPagesValue Previous stable pages value.
 * @param args.initialPercentValue Previous stable percent value.
 * @param args.interactionHandlers Detail interaction handlers.
 * @returns Updated initial values and apply status.
 */
export function submitProgressUpdate(
  args: SubmitProgressUpdateArgs,
): {
  initialPagesValue: string;
  initialPercentValue: string;
  applied: boolean;
} {
  const {
    event,
    row,
    pagesInput,
    pctInput,
    initialPagesValue,
    initialPercentValue,
    interactionHandlers,
  } = args;
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
