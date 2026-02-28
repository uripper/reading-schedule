import { COVER_PLACEHOLDER } from "./constants.js";
import type { CardHandlers } from "../../types/types.js";

/**
 * Wires edit/remove/fallback-cover handlers for rendered book cards.
 * @param rootNode Root container containing card elements.
 * @param handlers Callback handlers for card actions.
 * @param handlers.onEdit Called when edit button is clicked.
 * @param handlers.onRemove Called when remove button is clicked.
 */
export function bindCardEvents(
  rootNode: HTMLElement,
  handlers: CardHandlers,
): void {
  rootNode
    .querySelectorAll<HTMLButtonElement>(".edit-book-btn")
    .forEach((button) => {
      button.addEventListener("click", () => {
        handlers.onEdit(button.dataset.bookId ?? "");
      });
    });
  rootNode
    .querySelectorAll<HTMLButtonElement>(".remove-book-btn")
    .forEach((button) => {
      button.addEventListener("click", () => {
        handlers.onRemove(button.dataset.bookId ?? "");
      });
    });
  rootNode
    .querySelectorAll<HTMLImageElement>("img[data-fallback-cover='1']")
    .forEach((image) => {
      const nextImage = image;
      image.addEventListener("error", () => {
        nextImage.src = COVER_PLACEHOLDER;
        nextImage.classList.add("is-empty");
      });
    });
}
