import { navigateToEstimatedFinishDate } from "./estimated_finish_navigation.js";
import type { CardNavigationActions } from "../../types/books_types.js";
export type { CardNavigationActions };

const ESTIMATED_FINISH_BUTTON_CLASS = "book-estimated-finish-btn";
const AFTER_LINK_BUTTON_CLASS = "book-after-link-btn";
const ESTIMATED_FINISH_ICON = "🗓";
const ESTIMATED_FINISH_LABEL = "Est. Finish";

/**
 * Builds interactive estimated-finish control for schedulable books.
 * @param dateKey Estimated finish date key.
 * @param actions Shared card navigation callbacks.
 * @returns Configured button element.
 */
export function estimatedFinishButton(
  dateKey: string,
  actions: CardNavigationActions,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ESTIMATED_FINISH_BUTTON_CLASS;
  button.dataset.finishDate = dateKey;
  button.setAttribute(
    "aria-label",
    `Open schedule for estimated finish ${dateKey}`,
  );
  button.title = "Open in schedule";
  button.textContent = `${ESTIMATED_FINISH_ICON} ${ESTIMATED_FINISH_LABEL} ${dateKey}`;
  button.onclick = () => {
    navigateToEstimatedFinishDate(dateKey, (nextDateKey) => {
      actions.onEstimatedFinishNavigate(nextDateKey);
    });
  };
  return button;
}

/**
 * Builds clickable blocker metadata that scrolls to the referenced book card.
 * @param label Human-readable blocker metadata label.
 * @param blockerBookId Referenced blocker book id.
 * @param onNavigate Callback used to navigate to a book id.
 * @returns Configured button element.
 */
export function afterBookLinkButton(
  label: string,
  blockerBookId: string,
  onNavigate: (bookId: string) => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = AFTER_LINK_BUTTON_CLASS;
  button.dataset.afterBookId = blockerBookId;
  button.textContent = label;
  button.onclick = () => {
    onNavigate(blockerBookId);
  };
  return button;
}
