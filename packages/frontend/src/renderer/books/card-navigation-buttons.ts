/** Builds card buttons that navigate to schedule days or other book cards. */
import type { CardNavigationActions } from "../../types/types.ts";
import { navigateToEstimatedFinishDate } from "./estimated_finish_navigation.ts";

const ESTIMATED_FINISH_BUTTON_CLASS = "book-estimated-finish-btn";
const FINISHED_BUTTON_CLASS = "book-finished-btn";
const AFTER_LINK_BUTTON_CLASS = "book-after-link-btn";
const ESTIMATED_FINISH_LABEL = "Est. Finish";
const FINISHED_LABEL = "Finished";
const OPEN_IN_SCHEDULE_TITLE = "Open in schedule";

// audit-allow-local-types: This shape is private finish-button wiring.
type FinishDateButtonSpec = {
    className: string;
    dateKey: string;
    description: string;
    label: string;
};

/**
 * Builds a finish-date control that opens the schedule on its day.
 * @param spec - Class, label, and accessible description for the control.
 * @param actions - Shared card navigation callbacks.
 * @returns Configured button element.
 */
function finishDateButton(
    spec: FinishDateButtonSpec,
    actions: CardNavigationActions,
): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = spec.className;
    BUTTON.dataset.finishDate = spec.dateKey;
    BUTTON.setAttribute(
        "aria-label",
        `Open schedule for ${spec.description} ${spec.dateKey}`,
    );
    BUTTON.title = OPEN_IN_SCHEDULE_TITLE;
    BUTTON.textContent = `${spec.label} ${spec.dateKey}`;
    BUTTON.onclick = () => {
        navigateToEstimatedFinishDate(spec.dateKey, (nextDateKey) => {
            actions.onEstimatedFinishNavigate(nextDateKey);
        });
    };
    return BUTTON;
}

/**
 * Builds interactive estimated-finish control for schedulable books.
 * @param dateKey - Estimated finish date key.
 * @param actions - Shared card navigation callbacks.
 * @returns Configured button element.
 */
export function estimatedFinishButton(
    dateKey: string,
    actions: CardNavigationActions,
): HTMLButtonElement {
    return finishDateButton(
        {
            className: ESTIMATED_FINISH_BUTTON_CLASS,
            dateKey,
            description: "estimated finish",
            label: ESTIMATED_FINISH_LABEL,
        },
        actions,
    );
}

/**
 * Builds interactive finished-date control for read books.
 * @param dateKey - Day key the book was finished on.
 * @param actions - Shared card navigation callbacks.
 * @returns Configured button element.
 */
export function finishedDateButton(
    dateKey: string,
    actions: CardNavigationActions,
): HTMLButtonElement {
    return finishDateButton(
        {
            className: FINISHED_BUTTON_CLASS,
            dateKey,
            description: "finished date",
            label: FINISHED_LABEL,
        },
        actions,
    );
}

/**
 * Builds clickable blocker metadata that scrolls to the referenced book card.
 * @param label - Human-readable blocker metadata label.
 * @param blockerBookId - Referenced blocker book id.
 * @param onNavigate - Callback used to navigate to a book id.
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
