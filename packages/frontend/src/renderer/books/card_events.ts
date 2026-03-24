import type { CardHandlers } from "../../types/types.ts";
import { COVER_PLACEHOLDER } from "./constants.ts";

/**
 * Wires edit/remove/fallback-cover handlers for rendered book cards.
 * @param rootNode - Root container containing card elements.
 * @param handlers -  Callback handlers for card actions.
 *        handlers.onEdit - Called when edit button is clicked.
 *        handlers.onRemove Called when remove button is clicked.
 */
export function bindCardEvents(
    rootNode: HTMLElement,
    handlers: CardHandlers,
): void {
    for (const BUTTON of rootNode.querySelectorAll<HTMLButtonElement>(
        ".remove-book-btn",
    )) {
        BUTTON.addEventListener("click", () => {
            handlers.onRemove(BUTTON.dataset.bookId ?? "");
        });
    }

    for (const BUTTON of rootNode.querySelectorAll<HTMLButtonElement>(
        ".edit-book-btn",
    )) {
        BUTTON.addEventListener("click", () => {
            handlers.onEdit(BUTTON.dataset.bookId ?? "");
        });
    }

    for (const IMAGE of rootNode.querySelectorAll<HTMLImageElement>(
        "img[data-fallback-cover='1']",
    )) {
        const NEXT_IMAGE = IMAGE;
        IMAGE.addEventListener("error", () => {
            NEXT_IMAGE.src = COVER_PLACEHOLDER;
            NEXT_IMAGE.classList.add("is-empty");
        });
    }
}
