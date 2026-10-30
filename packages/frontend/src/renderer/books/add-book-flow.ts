/** Opens the existing book form from another feature and resolves after save or cancellation. */
import type {
    Book,
    BookDialogController,
    BookInput,
} from "@reading-schedule/contracts";
import { normalizeBook } from "./model-normalize.ts";

// audit-allow-local-types: These controller and DOM references are renderer implementation state.
type AddBookContext = Parameters<typeof configureAddBookFlow>[0];
let configuredContext: AddBookContext | null = null;

/** Supplies the live controller without introducing a controller import cycle. */
export function configureAddBookFlow(context: {
    element: HTMLDialogElement;
    getBook(bookId: string): Book | null;
    getDialog(): BookDialogController | null;
}): void {
    configuredContext = context;
}

/** Creates a draft using the ordinary add-book dialog and returns only a saved book. */
export async function addLibraryBook(draft: BookInput): Promise<Book | null> {
    if (configuredContext === null) {
        throw new Error(
            "The book form is not ready. Close sync and try again.",
        );
    }
    return await requestBook(configuredContext, normalizeBook(draft));
}

/** Cleans up the close listener if opening fails, and distinguishes cancel from save by draft ID. */
function requestBook(
    context: AddBookContext,
    book: Book,
): Promise<Book | null> {
    return new Promise((resolve, reject) => {
        const FINISH = (): void => {
            resolve(context.getBook(book.book_id));
        };
        const DIALOG = context.getDialog();
        if (DIALOG === null || context.element.open) {
            reject(
                new Error(
                    "Another book form is already open. Close it and retry.",
                ),
            );
            return;
        }
        context.element.addEventListener("close", FINISH, { once: true });
        try {
            DIALOG.open(null, { initialBook: book });
        } catch (error) {
            context.element.removeEventListener("close", FINISH);
            reject(
                new Error("Could not open the add-book form.", {
                    cause: error,
                }),
            );
        }
    });
}
