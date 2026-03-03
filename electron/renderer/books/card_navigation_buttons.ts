import type { CardNavigationActions } from "../../types/types.js";
import { navigateToEstimatedFinishDate } from "./estimated_finish_navigation.js";

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
    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = ESTIMATED_FINISH_BUTTON_CLASS;
    BUTTON.dataset.finishDate = dateKey;
    BUTTON.setAttribute(
        "aria-label",
        `Open schedule for estimated finish ${dateKey}`,
    );
    BUTTON.title = "Open in schedule";
    BUTTON.textContent = `${ESTIMATED_FINISH_ICON} ${ESTIMATED_FINISH_LABEL} ${dateKey}`;
    BUTTON.onclick = () => {
        navigateToEstimatedFinishDate(dateKey, (nextDateKey) => {
            actions.onEstimatedFinishNavigate(nextDateKey);
        });
    };
    return BUTTON;
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
    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = AFTER_LINK_BUTTON_CLASS;
    BUTTON.dataset.afterBookId = blockerBookId;
    BUTTON.textContent = label;
    BUTTON.onclick = () => {
        onNavigate(blockerBookId);
    };
    return BUTTON;
}
