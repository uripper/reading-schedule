import type {
    Book,
    BookDialogController,
    BookDialogSubmitPayload,
    BookFormRefs,
    BookSubmitPayload,
} from "../../types/types.ts";
import {
    createBookSubmitPayload,
    showSubmitError,
    submitBookDialogPayload,
} from "./dialog_submit.ts";
import type { BookDialogNavigationDirection } from "./dialog-navigation.ts";
import { wrappedBookDialogIndex } from "./dialog-navigation.ts";
import type { DialogSessionState } from "./dialog-session.ts";

function bookById(books: Book[], bookId: string): Book | null {
    return books.find((book) => String(book.book_id) === bookId) ?? null;
}

async function saveCurrentForNavigation(options: {
    onSubmit: (payload: BookDialogSubmitPayload) => Promise<void> | void;
    refs: BookFormRefs;
}): Promise<boolean> {
    let payload: BookSubmitPayload;
    try {
        payload = createBookSubmitPayload(options.refs);
    } catch (error: unknown) {
        showSubmitError(options.refs, error);
        return false;
    }
    try {
        await submitBookDialogPayload({ ...options, payload });
        return true;
    } catch {
        return false;
    }
}

function nextBookId(sessionState: DialogSessionState, index: number): string {
    return sessionState.navigationBookIds[index] ?? "";
}

export async function navigateVisibleBook(options: {
    direction: BookDialogNavigationDirection;
    getBooks: () => Book[];
    onSubmit: (payload: BookDialogSubmitPayload) => Promise<void> | void;
    open: BookDialogController["open"];
    refs: BookFormRefs;
    sessionState: DialogSessionState;
}): Promise<void> {
    const NEXT_INDEX = wrappedBookDialogIndex(
        options.sessionState.navigationBookIds,
        options.sessionState.currentBookId,
        options.direction,
    );
    if (NEXT_INDEX < 0) {
        return;
    }
    const SAVED = await saveCurrentForNavigation(options);
    if (!SAVED) {
        return;
    }
    const NEXT_BOOK = bookById(
        options.getBooks(),
        nextBookId(options.sessionState, NEXT_INDEX),
    );
    if (NEXT_BOOK === null) {
        return;
    }
    options.open(NEXT_BOOK, {
        navigationBookIds: options.sessionState.navigationBookIds,
    });
}
