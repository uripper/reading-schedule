import type { CalendarRowWithFinish } from "./data.js";
import type { DetailInteractionHandlers } from "./details_types.js";
import { parseOptionalNumber } from "./utils.js";

export function setInputValueFromBookProgress(
  inputNode: HTMLInputElement,
  value?: string | number,
): void {
  if (value !== null && value !== undefined) {
    inputNode.value = String(value);
  }
}

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
