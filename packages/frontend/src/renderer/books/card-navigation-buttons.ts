/** Builds card buttons that navigate to schedule days or other book cards. */
import type { BlockerMeta, CardNavigationActions } from "../../types/types.ts";
import { navigateToEstimatedFinishDate } from "./estimated_finish_navigation.ts";

const ESTIMATED_FINISH_BUTTON_CLASS = "book-estimated-finish-btn";
const FINISHED_BUTTON_CLASS = "book-finished-btn";
const AFTER_LINK_BUTTON_CLASS = "book-after-link-btn";
const ESTIMATED_FINISH_LABEL = "Est. Finish";
const FINISHED_LABEL = "Finished";
const OPEN_IN_SCHEDULE_TITLE = "Open in schedule";
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
const FULL_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
});

// audit-allow-local-types: This shape is private finish-button wiring.
type FinishDateButtonSpec = {
    className: string;
    dateKey: string;
    description: string;
    label: string;
};

/**
 * Formats a finish date with a short month so it fits the card, e.g.
 * `Dec 3, 2026`.
 * @param dateKey - Day key in `YYYY-MM-DD` form.
 * @returns Full date text, or the key itself when it cannot be read.
 */
export function formatFinishDate(dateKey: string): string {
    const PARTS = DATE_KEY_PATTERN.exec(dateKey);
    if (PARTS === null) {
        return dateKey;
    }
    const DATE = new Date(
        Number(PARTS[1]),
        Number(PARTS[2]) - 1,
        Number(PARTS[3]),
    );
    return FULL_DATE_FORMAT.format(DATE);
}

/**
 * Creates one line of the finish chip.
 * @param className - Line class.
 * @param text - Line text.
 * @returns Line element.
 */
function finishChipLine(className: string, text: string): HTMLSpanElement {
    const LINE = document.createElement("span");
    LINE.className = className;
    LINE.textContent = text;
    return LINE;
}

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
    const SHOWN_DATE = formatFinishDate(spec.dateKey);
    BUTTON.className = `btn btn-compact book-finish-chip ${spec.className}`;
    BUTTON.dataset.finishDate = spec.dateKey;
    BUTTON.setAttribute(
        "aria-label",
        `Open schedule for ${spec.description} ${SHOWN_DATE}`,
    );
    BUTTON.title = OPEN_IN_SCHEDULE_TITLE;
    BUTTON.append(
        finishChipLine("book-finish-chip-label", spec.label),
        finishChipLine("book-finish-chip-date", SHOWN_DATE),
    );
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
 * Builds the card's short "After:" link, which scrolls to the book this one
 * comes after. Long titles are cut with an ellipsis; the tooltip has it all.
 * @param blocker - Short label, full title, and id of the earlier book.
 * @param onNavigate - Callback used to navigate to a book id.
 * @returns Configured button element.
 */
export function afterBookLinkButton(
    blocker: BlockerMeta,
    onNavigate: (bookId: string) => void,
): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = AFTER_LINK_BUTTON_CLASS;
    BUTTON.dataset.afterBookId = blocker.blockerBookId;
    BUTTON.textContent = blocker.label;
    BUTTON.title = `After: ${blocker.fullTitle}`;
    BUTTON.setAttribute(
        "aria-label",
        `Go to ${blocker.fullTitle}, read before this book`,
    );
    BUTTON.onclick = () => {
        onNavigate(blocker.blockerBookId);
    };
    return BUTTON;
}
