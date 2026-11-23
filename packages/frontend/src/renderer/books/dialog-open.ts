/** Opens a fresh dialog session and releases its previous transient cover preview. */
import type { Book, OpenBookDialogArgs } from "../../types/types.ts";
import { renderSyncLinks } from "../sync/links-panel.ts";
import { fillBulkEditForm } from "./bulk-edit-fill.ts";
import { sharedCollections } from "./collection_bulk.ts";
import { renderCollectionPicker } from "./collection_picker.ts";
import { releaseCoverUpload } from "./cover-upload-staging.ts";
import {
    applyBookDialogDisplayMode,
    isBulkDialogMode,
} from "./dialog-display.ts";
import type { BookDialogNavigationRefs } from "./dialog-navigation.ts";
import { updateBookDialogNavigation } from "./dialog-navigation.ts";
import type { DialogSessionState } from "./dialog-session.ts";
import { selectedBulkBooks, syncDialogSessionState } from "./dialog-session.ts";
import { resetBookDialogProgress } from "./dialog_progress_sync.ts";
import { syncBookDialogRemove } from "./dialog_remove.ts";
import { resetBookDialogSubmitState } from "./dialog_submit.ts";
import { clearForm, fillForm } from "./form-state.ts";
import { syncBookFormControls } from "./form_controls.ts";
import type { getBookFormRefs } from "./form_refs.ts";
import { renderShelfPicker } from "./shelf_picker.ts";

const BOOK_DIALOG_OPEN_CLASS = "book-dialog-open";

interface ViewportScrollPosition {
    scrollX: number;
    scrollY: number;
}
type InternalOpenBookDialogArgs = OpenBookDialogArgs & {
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

/**
 * Chooses the collections shown when the dialog opens: those shared by every
 * mass-edited book, the edited or prefilled book's own, otherwise the active
 * Library collection filter.
 * @param args - Dialog open arguments.
 * @param bulkBooks - Books selected for mass edit, if any.
 * @returns Collection names to show as chips.
 */
function selectedCollectionsForDialog(
    args: OpenBookDialogArgs,
    bulkBooks: Book[],
): string[] {
    if (bulkBooks.length > 0) {
        return sharedCollections(bulkBooks);
    }
    const BOOK = args.book ?? args.dialogOptions.initialBook;
    if (BOOK !== undefined) {
        return BOOK.collections;
    }
    const DEFAULT_COLLECTION = String(
        args.dialogOptions.defaultCollection ?? "",
    ).trim();
    if (DEFAULT_COLLECTION === "") {
        return [];
    }
    return [DEFAULT_COLLECTION];
}

function applyDialogBookState(args: {
    allBooks: Book[];
    book: Book | null;
    initialBook?: Book;
    bulkBooks: Book[];
    refs: ReturnType<typeof getBookFormRefs>;
}): void {
    const FORM_REFS = args.refs;
    renderSyncLinks(singleBook(args.book, args.bulkBooks));
    FORM_REFS.dialogTitle.textContent = "Add Book";
    if (args.bulkBooks.length > 0) {
        FORM_REFS.dialogTitle.textContent = `Edit ${args.bulkBooks.length} Books`;
        fillBulkEditForm(FORM_REFS, args.bulkBooks, args.allBooks);
        return;
    }
    const BOOK = args.book ?? args.initialBook;
    if (BOOK === undefined) {
        return;
    }
    if (args.book !== null) {
        FORM_REFS.dialogTitle.textContent = "Edit Book";
    }
    fillForm(FORM_REFS, BOOK);
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
    const { book } = args;
    const ALL_BOOKS = args.getBooks();
    const BULK_BOOKS = selectedBulkBooks(
        args.dialogOptions.bulkBookIds ?? [],
        ALL_BOOKS,
    );
    const SCROLL_POSITION = currentViewportScroll();
    releaseCoverUpload(args.refs.coverLocal.value);
    syncDialogSessionState(args.sessionState, book, args.dialogOptions);
    args.dialogFocus.rememberOpener();
    clearForm(args.refs, args.lookupControl);
    openAfterBookPicker(args, book);
    renderShelfPicker(args.refs, ALL_BOOKS, selectedShelfForDialog(args));
    renderCollectionPicker(
        args.refs,
        ALL_BOOKS,
        selectedCollectionsForDialog(args, BULK_BOOKS),
    );
    applyDialogBookState({
        allBooks: ALL_BOOKS,
        book,
        bulkBooks: BULK_BOOKS,
        initialBook: args.dialogOptions.initialBook,
        refs: args.refs,
    });
    finishBookDialogOpen(args, SCROLL_POSITION);
}

/** Sync links describe one saved book, never a bulk selection or a draft. */
function singleBook(
    book: Book | null,
    bulkBooks: readonly Book[],
): Book | null {
    if (bulkBooks.length > 0) {
        return null;
    }
    return book;
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

function finishBookDialogOpen(
    args: InternalOpenBookDialogArgs,
    position: ViewportScrollPosition,
): void {
    const FORM_REFS = args.refs;
    resetBookDialogSubmitState(FORM_REFS);
    resetBookDialogProgress(FORM_REFS);
    syncBookFormControls(FORM_REFS);
    syncBookDialogRemove(
        args.book !== null && args.sessionState.mode !== "bulk",
    );
    applyBookDialogDisplayMode(FORM_REFS, args.dialogOptions);
    updateBookDialogNavigation(
        args.navigation,
        args.sessionState.navigationBookIds,
        args.sessionState.currentBookId,
    );
    lockBookDialogScroll();
    showBookDialog(FORM_REFS.dialog);
    focusOpenedDialog(args);
    restoreViewportScroll(position);
}
