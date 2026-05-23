import type { Book } from "../../types/types.ts";
import { confirmDestructiveAction } from "../confirm/destructive-confirm.ts";

export function confirmRemoveBook(book: Book): Promise<boolean> {
    return confirmDestructiveAction({
        confirmLabel: "Remove Book",
        message: `Remove "${book.title}" from your library?`,
        title: "Remove Book",
    });
}
