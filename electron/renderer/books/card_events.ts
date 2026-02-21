import { COVER_PLACEHOLDER } from "./constants.js";

export type CardHandlers = {
  onEdit: (bookId: string) => void;
  onRemove: (bookId: string) => void;
};

export function bindCardEvents(
  rootNode: HTMLElement,
  { onEdit, onRemove }: CardHandlers,
): void {
  rootNode.querySelectorAll<HTMLButtonElement>(".edit-book-btn").forEach((button) => {
    button.onclick = () => onEdit(button.dataset.bookId || "");
  });
  rootNode
    .querySelectorAll<HTMLButtonElement>(".remove-book-btn")
    .forEach((button) => {
      button.onclick = () => onRemove(button.dataset.bookId || "");
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
