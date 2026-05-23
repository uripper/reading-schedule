import type { Book, OpenBookDialogArgs } from "../../types/types.ts";
import { fillBulkEditForm } from "./bulk-edit-fill.ts";
import { resetBookDialogSubmitState } from "./dialog_submit.ts";
import {
    applyBookDialogDisplayMode,
    isBulkDialogMode,
} from "./dialog-display.ts";
import type { BookDialogNavigationRefs } from "./dialog-navigation.ts";
import { updateBookDialogNavigation } from "./dialog-navigation.ts";
import type { DialogSessionState } from "./dialog-session.ts";
import { selectedBulkBooks, syncDialogSessionState } from "./dialog-session.ts";
import type { getBookFormRefs } from "./form_refs.ts";
import { clearForm, fillForm } from "./form-state.ts";
import { renderShelfPicker } from "./shelf_picker.ts";

const BOOK_DIALOG_OPEN_CLASS = "book-dialog-open";

interface ViewportScrollPosition {
    scrollX: number;
    scrollY: number;
}

export type InternalOpenBookDialogArgs = OpenBookDialogArgs & {
    navigation: BookDialogNavigationRefs;
    sessionState: DialogSessionState;
};

function currentViewportScroll(): ViewportScrollPosition {
    return {
        scrollX: globalThis.scrollX,
        scrollY: globalThis.scrollY,
    };
}

function restoreViewportScroll(position: ViewportScrollPosition): void {
    if (typeof globalThis.scrollTo !== "function") {
        return;
    }
    globalThis.scrollTo(position.scrollX, position.scrollY);
}

function lockBookDialogScroll(): void {
    document.body.classList.add(BOOK_DIALOG_OPEN_CLASS);
}

function showBookDialog(dialog: HTMLDialogElement): void {
    if (dialog.open) {
        return;
    }
    dialog.showModal();
}

function selectedShelfForDialog(args: OpenBookDialogArgs): string {
    const SELECTED_SHELF = String(args.dialogOptions.defaultShelf ?? "").trim();
    if (args.book !== null && args.book.shelf !== "") {
        return args.book.shelf;
    }
    return SELECTED_SHELF;
}

function applyDialogBookState(args: {
    allBooks: Book[];
    book: Book | null;
    bulkBooks: Book[];
    refs: ReturnType<typeof getBookFormRefs>;
}): void {
    const FORM_REFS = args.refs;
    FORM_REFS.dialogTitle.textContent = "Add Book";
    if (args.bulkBooks.length > 0) {
        FORM_REFS.dialogTitle.textContent = `Edit ${args.bulkBooks.length} Books`;
        fillBulkEditForm(FORM_REFS, args.bulkBooks, args.allBooks);
        return;
    }
    if (args.book === null) {
        return;
    }
    FORM_REFS.dialogTitle.textContent = "Edit Book";
    fillForm(FORM_REFS, args.book);
}

function focusOpenedDialog(args: InternalOpenBookDialogArgs): void {
    if (args.sessionState.mode === "bulk") {
        args.refs.author.focus();
        return;
    }
    args.dialogFocus.focusInitialTarget();
}

export function unlockBookDialogScroll(): void {
    document.body.classList.remove(BOOK_DIALOG_OPEN_CLASS);
}

export function openBookDialog(args: InternalOpenBookDialogArgs): void {
    const FORM_REFS = args.refs;
    const { book } = args;
    const ALL_BOOKS = args.getBooks();
    const BULK_BOOKS = selectedBulkBooks(
        args.dialogOptions.bulkBookIds ?? [],
        ALL_BOOKS,
    );
    const SCROLL_POSITION = currentViewportScroll();
    syncDialogSessionState(args.sessionState, book, args.dialogOptions);
    args.dialogFocus.rememberOpener();
    clearForm(FORM_REFS, args.lookupControl);
    openAfterBookPicker(args, book);
    renderShelfPicker(FORM_REFS, ALL_BOOKS, selectedShelfForDialog(args));
    applyDialogBookState({
        allBooks: ALL_BOOKS,
        book,
        bulkBooks: BULK_BOOKS,
        refs: FORM_REFS,
    });
    finishBookDialogOpen(args);
    restoreViewportScroll(SCROLL_POSITION);
}

function openAfterBookPicker(
    args: InternalOpenBookDialogArgs,
    book: Book | null,
): void {
    if (isBulkDialogMode(args.dialogOptions)) {
        args.afterBookPicker.openForBook(null);
        return;
    }
    args.afterBookPicker.openForBook(book);
}

function finishBookDialogOpen(args: InternalOpenBookDialogArgs): void {
    const FORM_REFS = args.refs;
    resetBookDialogSubmitState(FORM_REFS);
    applyBookDialogDisplayMode(FORM_REFS, args.dialogOptions);
    updateBookDialogNavigation(
        args.navigation,
        args.sessionState.navigationBookIds,
        args.sessionState.currentBookId,
    );
    lockBookDialogScroll();
    showBookDialog(FORM_REFS.dialog);
    focusOpenedDialog(args);
}
