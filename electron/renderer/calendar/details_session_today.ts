import type { CalendarRowWithFinish } from "./data.js";
import type {
  CalendarStateSubset,
  DetailInteractionHandlers,
} from "./details_types.js";
import { fallbackBookForRow } from "./details_fallback_book.js";
import { minutesFormForSession } from "./details_minutes_form.js";
import { progressFormForToday } from "./details_progress_form.js";
import {
  baseSessionItem,
  COMPLETE_ITEM_CLASS,
  COMPLETE_TOGGLE_LABEL,
  DAY_DETAILS_META_CLASS,
  removeSessionButton,
} from "./details_session_shared.js";
import { estimateProgressLabel } from "./estimates.js";
import { sessionKeyFor } from "./utils.js";

export function buildTodaySessionItem(
  row: CalendarRowWithFinish,
  state: CalendarStateSubset,
  interactionHandlers: DetailInteractionHandlers,
  rerenderDetails: () => void,
): HTMLElement {
  const item = baseSessionItem(row);
  const sessionKey = sessionKeyFor(row);
  const completeLabel = document.createElement("label");
  completeLabel.className = "day-complete-toggle";
  const completeInput = document.createElement("input");
  completeInput.type = "checkbox";
  completeInput.checked = Boolean(
    interactionHandlers.isSessionCompleted(sessionKey),
  );
  completeLabel.append(completeInput, COMPLETE_TOGGLE_LABEL);
  item.classList.toggle(COMPLETE_ITEM_CLASS, completeInput.checked);
  completeInput.onchange = () => {
    const checked = Boolean(completeInput.checked);
    item.classList.toggle(COMPLETE_ITEM_CLASS, checked);
    interactionHandlers.onSessionCompletionChanged({
      completed: checked,
      row,
      sessionKey,
    });
    rerenderDetails();
  };
  const markCompleteFromProgressUpdate = () => {
    if (completeInput.checked) {
      return;
    }
    completeInput.checked = true;
    item.classList.add(COMPLETE_ITEM_CLASS);
    interactionHandlers.onSessionCompletionChanged({
      completed: true,
      row,
      sessionKey,
    });
    rerenderDetails();
  };
  const estimate = document.createElement("p");
  estimate.className = DAY_DETAILS_META_CLASS;
  estimate.textContent = estimateProgressLabel(
    row,
    state,
    interactionHandlers.getBookById,
    interactionHandlers.isSessionCompleted,
  );
  const book = interactionHandlers.getBookById(row.book_id);
  if (!book) {
    item.append(
      completeLabel,
      minutesFormForSession(row, interactionHandlers, rerenderDetails),
      progressFormForToday(
        row,
        fallbackBookForRow(row),
        interactionHandlers,
        markCompleteFromProgressUpdate,
      ),
      estimate,
      removeSessionButton(row, interactionHandlers, rerenderDetails),
    );
    return item;
  }
  item.append(
    completeLabel,
    minutesFormForSession(row, interactionHandlers, rerenderDetails),
    progressFormForToday(
      row,
      book,
      interactionHandlers,
      markCompleteFromProgressUpdate,
    ),
    estimate,
    removeSessionButton(row, interactionHandlers, rerenderDetails),
  );
  return item;
}
