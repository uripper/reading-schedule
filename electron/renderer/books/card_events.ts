import { COVER_PLACEHOLDER } from "./constants.js";

export interface CardHandlers {
  onEdit(bookId: string): void;
  onRemove(bookId: string): void;
}

/**
 *
 * @param rootNode
 * @param root0
 * @param root0.onEdit
 * @param root0.onRemove
 */
export function bindCardEvents(
  rootNode: HTMLElement,
  { onEdit, onRemove }: CardHandlers,
): void {
  rootNode
    .querySelectorAll<HTMLButtonElement>(".edit-book-btn")
    .forEach((button) => {
      button.onclick = () => {
        onEdit(button.dataset.bookId || "");
      };
    });
  rootNode
    .querySelectorAll<HTMLButtonElement>(".remove-book-btn")
    .forEach((button) => {
      button.onclick = () => {
        onRemove(button.dataset.bookId || "");
      };
    });
  rootNode
    .querySelectorAll<HTMLImageElement>("img[data-fallback-cover='1']")
    .forEach((image) => {
      image.addEventListener("error", () => {
        image.src = COVER_PLACEHOLDER;
        image.classList.add("is-empty");
      });
    });
}
