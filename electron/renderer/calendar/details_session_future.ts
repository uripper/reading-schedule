import type { CalendarRowWithFinish } from "./data.js";
import type {
  CalendarStateSubset,
  DetailInteractionHandlers,
} from "./details_types.js";
import { estimateProgressLabel } from "./estimates.js";
import { minutesFormForSession } from "./details_minutes_form.js";
import { baseSessionItem, DAY_DETAILS_META_CLASS, removeSessionButton } from "./details_session_shared.js";

export function buildFutureSessionItem(
  row: CalendarRowWithFinish,
  state: CalendarStateSubset,
  interactionHandlers: DetailInteractionHandlers,
  rerenderDetails: () => void,
): HTMLElement {
  const item = baseSessionItem(row);
  const estimate = document.createElement("p");
  estimate.className = DAY_DETAILS_META_CLASS;
  estimate.textContent = estimateProgressLabel(
    row,
    state,
    interactionHandlers.getBookById,
    interactionHandlers.isSessionCompleted,
  );
  item.append(
    estimate,
    minutesFormForSession(row, interactionHandlers, rerenderDetails),
    removeSessionButton(row, interactionHandlers, rerenderDetails),
  );
  return item;
}
