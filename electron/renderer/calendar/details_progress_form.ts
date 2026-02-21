import type { Book } from "../books/types.js";
import type { CalendarRowWithFinish } from "./data.js";
import { parseOptionalNumber } from "./utils.js";
import type { DetailInteractionHandlers } from "./details_types.js";

function setInputValueFromBookProgress(
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

function submitProgressUpdate(
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

export function progressFormForToday(
  row: CalendarRowWithFinish,
  book: Book,
  interactionHandlers: DetailInteractionHandlers,
  onProgressApplied: () => void,
): HTMLFormElement {
  const progressForm = document.createElement("form");
  progressForm.className = "day-progress-form";

  const pagesInput = document.createElement("input");
  pagesInput.type = "number";
  pagesInput.min = "0";
  pagesInput.step = "1";
  pagesInput.placeholder = "Pages read";
  setInputValueFromBookProgress(pagesInput, book.pages_read ?? undefined);

  const pctInput = document.createElement("input");
  pctInput.type = "number";
  pctInput.min = "0";
  pctInput.max = "100";
  pctInput.step = "0.1";
  pctInput.placeholder = "Percent complete";
  setInputValueFromBookProgress(pctInput, book.progress_percent);

  const pagesLabel = document.createElement("label");
  pagesLabel.className = "day-progress-field";
  pagesLabel.textContent = "Pages Read";
  pagesLabel.append(pagesInput);

  const percentLabel = document.createElement("label");
  percentLabel.className = "day-progress-field";
  percentLabel.textContent = "Complete %";
  percentLabel.append(pctInput);

  let initialPagesValue = String(pagesInput.value ?? "").trim();
  let initialPercentValue = String(pctInput.value ?? "").trim();

  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.className = "btn";
  saveBtn.textContent = "Update Progress";

  progressForm.append(pagesLabel, percentLabel, saveBtn);
  progressForm.onsubmit = (event) => {
    const updatedValues = submitProgressUpdate(
      event,
      row,
      pagesInput,
      pctInput,
      initialPagesValue,
      initialPercentValue,
      interactionHandlers,
    );
    initialPagesValue = updatedValues.initialPagesValue;
    initialPercentValue = updatedValues.initialPercentValue;
    if (updatedValues.applied) {
      onProgressApplied();
    }
  };

  return progressForm;
}
