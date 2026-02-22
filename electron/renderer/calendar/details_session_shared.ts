import type { CalendarRowWithFinish } from "./data.js";
import type { DetailInteractionHandlers } from "./details_types.js";

export const DAY_DETAILS_META_CLASS = "day-details-meta";
export const COMPLETE_ITEM_CLASS = "is-complete";
export const COMPLETE_TOGGLE_LABEL = " Complete session";
const REMOVE_SESSION_LABEL = "Remove session";

/**
 *
 * @param row
 */
export function baseSessionItem(row: CalendarRowWithFinish): HTMLElement {
  const item = document.createElement("article");
  item.className = "day-details-item";
  if (row.finish) {
    item.classList.add("is-finish");
  }
  const head = document.createElement("strong");
  head.textContent = row.title || "Untitled";
  if (row.finish) {
    const finishBadge = document.createElement("span");
    finishBadge.className = "day-finish-badge";
    finishBadge.textContent = "Expected finish";
    item.append(head, finishBadge);
  } else {
    item.append(head);
  }
  return item;
}

/**
 *
 * @param row
 * @param interactionHandlers
 * @param rerenderDetails
 */
export function removeSessionButton(
  row: CalendarRowWithFinish,
  interactionHandlers: DetailInteractionHandlers,
  rerenderDetails: () => void,
): HTMLButtonElement {
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "btn-session-remove";
  removeButton.textContent = "x";
  removeButton.setAttribute("aria-label", REMOVE_SESSION_LABEL);
  removeButton.title = REMOVE_SESSION_LABEL;
  removeButton.onclick = () => {
    const title = String(row.title || "this session");
    const confirmed = globalThis.confirm(`Remove ${title} from ${row.date}?`);
    if (!confirmed) {
      return;
    }
    const removed = interactionHandlers.onSessionRemoved({ row });
    if (!removed) {
      return;
    }
    rerenderDetails();
  };
  return removeButton;
}
