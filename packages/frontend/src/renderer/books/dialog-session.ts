import type {
    Book,
    BookDialogSubmitPayload,
    BookFormRefs,
    OpenDialogOptions,
} from "../../types/types.ts";
import { createBulkBookSubmitPayload } from "./bulk-edit-form.ts";
import { createBookSubmitPayload } from "./dialog_submit.ts";
import { isBulkDialogMode } from "./dialog-display.ts";

export interface DialogSessionState {
    bulkBookIds: string[];
    currentBookId: string;
    mode: "single" | "bulk";
    navigationBookIds: string[];
}

export function createDialogSessionState(): DialogSessionState {
    return {
        bulkBookIds: [],
        currentBookId: "",
        mode: "single",
        navigationBookIds: [],
    };
}

export function selectedBulkBooks(bookIds: string[], books: Book[]): Book[] {
    const IDS = new Set(bookIds);
    if (IDS.size === 0) {
        return [];
    }
    return books.filter((book) => IDS.has(String(book.book_id)));
}

export function syncDialogSessionState(
    state: DialogSessionState,
    book: Book | null,
    options: OpenDialogOptions,
): void {
    const SESSION = state;
    SESSION.mode = "single";
    if (isBulkDialogMode(options)) {
        SESSION.mode = "bulk";
    }
    SESSION.currentBookId = String(book?.book_id ?? "");
    SESSION.navigationBookIds = options.navigationBookIds ?? [];
    SESSION.bulkBookIds = options.bulkBookIds ?? [];
}

export function dialogSubmitPayload(
    refs: BookFormRefs,
    sessionState: DialogSessionState,
): BookDialogSubmitPayload {
    if (sessionState.mode === "bulk") {
        return createBulkBookSubmitPayload(refs, sessionState.bulkBookIds);
    }
    return createBookSubmitPayload(refs);
}
