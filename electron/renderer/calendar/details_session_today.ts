import type { CalendarRowWithFinish } from "./data.js";
import type {
  CalendarStateSubset,
  DetailInteractionHandlers,
} from "../../types/types_calendar.js";
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

/**
 * Builds details row node for today sessions with progress and completion UX.
 * @param row Calendar row.
 * @param state Calendar state subset.
 * @param interactionHandlers Detail interaction handlers.
 * @param rerenderDetails Details rerender callback.
 * @returns Rendered row element.
 */
export function buildTodaySessionItem(
  row: CalendarRowWithFinish,
  state: CalendarStateSubset,
  interactionHandlers: DetailInteractionHandlers,
  rerenderDetails: () => void,
): HTMLElement {
  const isSessionCompleted = (session: string): boolean => {
    return interactionHandlers.isSessionCompleted(session);
  };
  const getBookById = (
    bookId: string,
  ): ReturnType<DetailInteractionHandlers["getBookById"]> => {
    return interactionHandlers.getBookById(bookId);
  };
  const item = baseSessionItem(row);
  const sessionKey = sessionKeyFor(row);
  const completeLabel = document.createElement("label");
  completeLabel.className = "day-complete-toggle";
  const completeInput = document.createElement("input");
  completeInput.type = "checkbox";
  completeInput.checked = Boolean(isSessionCompleted(sessionKey));
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
  const markCompleteFromProgressUpdate = (): void => {
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
    getBookById,
    isSessionCompleted,
  );
  const includeEstimate = !isSessionCompleted(sessionKey);
  const book = getBookById(row.book_id) ?? fallbackBookForRow(row);
  item.append(completeLabel);
  item.append(minutesFormForSession(row, interactionHandlers, rerenderDetails));
  item.append(
    progressFormForToday(
      row,
      book,
      interactionHandlers,
      markCompleteFromProgressUpdate,
    ),
  );
  if (includeEstimate) {
    item.append(estimate);
  }
  item.append(removeSessionButton(row, interactionHandlers, rerenderDetails));
  return item;
}
