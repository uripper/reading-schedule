import type {
  Book,
  CalendarRowWithFinish,
  DetailInteractionHandlers,
} from "../../types/types.js";
import {
  setInputValueFromBookProgress,
  submitProgressUpdate,
} from "./details_progress_form_helpers.js";

/**
 * Builds progress update form for today's session row.
 * @param row Calendar row being edited.
 * @param book Current book model for defaults.
 * @param interactionHandlers Detail interaction handlers.
 * @param onProgressApplied Callback fired after successful apply.
 * @returns Progress form element.
 */
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

  let initialPagesValue = String(pagesInput.value).trim();
  let initialPercentValue = String(pctInput.value).trim();

  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.className = "btn";
  saveBtn.textContent = "Update Progress";

  progressForm.append(pagesLabel, percentLabel, saveBtn);
  progressForm.onsubmit = (event) => {
    const updatedValues = submitProgressUpdate({
      event,
      row,
      pagesInput,
      pctInput,
      initialPagesValue,
      initialPercentValue,
      interactionHandlers,
    });
    initialPagesValue = updatedValues.initialPagesValue;
    initialPercentValue = updatedValues.initialPercentValue;
    if (updatedValues.applied) {
      onProgressApplied();
    }
  };

  return progressForm;
}
