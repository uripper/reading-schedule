import type { CardHandlers } from "../../types/types.ts";
import { COVER_PLACEHOLDER } from "./constants.ts";

const MASS_SELECTED_CLASS = "is-mass-selected";

function bindRemoveButtons(
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
}

function bindEditButtons(rootNode: HTMLElement, handlers: CardHandlers): void {
    for (const BUTTON of rootNode.querySelectorAll<HTMLButtonElement>(
        ".edit-book-btn",
    )) {
        BUTTON.addEventListener("click", () => {
            handlers.onEdit(BUTTON.dataset.bookId ?? "");
        });
    }
}

function bindMassEditInputs(
    rootNode: HTMLElement,
    handlers: CardHandlers,
): void {
    for (const INPUT of rootNode.querySelectorAll<HTMLInputElement>(
        ".book-mass-select",
    )) {
        INPUT.addEventListener("change", () => {
            handlers.onMassEditSelection?.(
                INPUT.dataset.bookId ?? "",
                INPUT.checked,
            );
            INPUT.closest<HTMLElement>(".book-card")?.classList.toggle(
                MASS_SELECTED_CLASS,
                INPUT.checked,
            );
        });
    }
}

function bindFallbackCovers(rootNode: HTMLElement): void {
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

/**
 * Wires edit/remove/fallback-cover handlers for rendered book cards.
 * @param rootNode - Root container containing card elements.
 * @param handlers - Callback handlers for card actions.
 */
export function bindCardEvents(
    rootNode: HTMLElement,
    handlers: CardHandlers,
): void {
    bindRemoveButtons(rootNode, handlers);
    bindEditButtons(rootNode, handlers);
    bindMassEditInputs(rootNode, handlers);
    bindFallbackCovers(rootNode);
}
