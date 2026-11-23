/**
 * The edit dialog's Remove book action. It is a quiet danger button shown
 * only while editing one saved book; removal still asks for confirmation.
 */
import { logError } from "../../types/logger.ts";
import type { BookFormRefs } from "../../types/types.ts";

const REMOVE_BUTTON_ID = "removeBookBtn";
const AVAILABLE = "true";

/**
 * Finds the Remove book button.
 * @returns Button, or `null` when the dialog has none.
 */
function removeButton(): HTMLButtonElement | null {
    const BUTTON = document.getElementById(REMOVE_BUTTON_ID);
    if (BUTTON instanceof HTMLButtonElement) {
        return BUTTON;
    }
    return null;
}

/**
 * Binds the Remove book button to the library's confirm-and-remove flow.
 * @param refs - Book form references (for the edited book id).
 * @param onRemove - Confirms and removes; resolves `true` when removed.
 * @param close - Closes the dialog after a removal.
 */
export function bindBookDialogRemove(
    refs: BookFormRefs,
    onRemove: ((bookId: string) => Promise<boolean>) | undefined,
    close: () => void,
): void {
    const BUTTON = removeButton();
    if (BUTTON === null || onRemove === undefined) {
        return;
    }
    BUTTON.dataset.removeAvailable = AVAILABLE;
    BUTTON.addEventListener("click", () => {
        const BOOK_ID = refs.bookId.value.trim();
        if (BOOK_ID === "") {
            return;
        }
        onRemove(BOOK_ID)
            .then((removed) => {
                if (removed) {
                    close();
                }
            })
            .catch((error: unknown) => {
                logError("Could not remove the book.", error);
            });
    });
}

/**
 * Shows the Remove book button only when one saved book is being edited.
 * @param canRemove - Whether the dialog is editing a single saved book.
 */
export function syncBookDialogRemove(canRemove: boolean): void {
    const BUTTON = removeButton();
    if (BUTTON === null) {
        return;
    }
    BUTTON.hidden = !canRemove || BUTTON.dataset.removeAvailable !== AVAILABLE;
}
