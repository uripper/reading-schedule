import type {
    Book,
    BookDialogController,
    BookDialogOptions,
    BookFormRefs,
    BookSubmitPayload,
    OpenBookDialogArgs,
    OpenDialogOptions,
} from "../../types/types.js";
import { bindDialogFocus, focusFirstError } from "../accessibility/index.js";
import { bindBookLookup } from "../book_lookup.js";
import { createAfterBookPicker } from "./after_book_picker.js";
import { bindCoverUpload } from "./cover_upload.js";
import { bindBookDialogProgressSync } from "./dialog_progress_sync.js";
import { ensureBookFormLayoutFields } from "./form_layout.js";
import { getBookFormRefs } from "./form_refs.js";
import {
    applyLookupItem,
    clearForm,
    fillForm,
    parseFormBook,
} from "./form_state.js";
import { bindShelfPicker, renderShelfPicker } from "./shelf_picker.js";

/**
 * Updates the save button state while a dialog submission is in progress.
 * @param refs - Resolved DOM references for the book dialog.
 * @param busy - True while the save action is running.
 */
function setSavingState(refs: BookFormRefs, busy: boolean): void {
    const SAVE_BUTTON = refs.saveBtn;
    SAVE_BUTTON.disabled = busy;
    SAVE_BUTTON.textContent = "Save Book";
    if (busy) {
        SAVE_BUTTON.textContent = "Saving...";
    }
}

/**
 * Resolves the live books getter from optional dialog options.
 * @param options - Optional dialog dependencies.
 * @returns Function returning the current books collection.
 */
function booksGetter(options: BookDialogOptions): () => Book[] {
    return (): Book[] => {
        if (options.getBooks !== undefined) {
            return options.getBooks();
        }
        return [];
    };
}

/**
 * Resolves a user-facing error message from unknown save failures.
 * @param error - Unknown error thrown by submit handlers.
 * @returns User-visible save message.
 */
function saveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return "Could not save this book.";
}

/**
 * Opens dialog UI and applies add/edit form state.
 * @param args - Dialog open dependencies and target book state.
 * @param args.refs - Book form references.
 * @param args.dialogFocus - Dialog focus manager.
 * @param args.lookupControl - Lookup clear helper used during open.
 * @param args.afterBookPicker - After-book picker controller for blocker links.
 * @param args.getBooks - Getter returning current books.
 * @param args.book - Existing book in edit mode, or null for add mode.
 * @param args.dialogOptions - Optional open options such as default shelf.
 */
function openBookDialog(args: OpenBookDialogArgs): void {
    const FORM_REFS = args.refs;
    const { book } = args;
    args.dialogFocus.rememberOpener();
    clearForm(FORM_REFS, args.lookupControl);
    args.afterBookPicker.openForBook(book);
    let selectedShelf = String(args.dialogOptions.defaultShelf ?? "").trim();
    if (book !== null && book.shelf !== "") {
        selectedShelf = book.shelf;
    }
    renderShelfPicker(FORM_REFS, args.getBooks(), selectedShelf);
    FORM_REFS.dialogTitle.textContent = "Add Book";
    if (book) {
        FORM_REFS.dialogTitle.textContent = "Edit Book";
        fillForm(FORM_REFS, book);
    }
    FORM_REFS.dialog.showModal();
    args.dialogFocus.focusInitialTarget();
}

/**
 * Creates the add/edit book dialog controller and binds its form behavior.
 * @param onSubmit - Callback invoked with the parsed form payload on submit.
 * @param options - Optional dialog dependencies.
 * @param options.getBooks - Returns current books for shelf and related UI helpers.
 * @returns Dialog API exposing the `open` function.
 */
/**
 * Binds form submission handler for book dialog.
 */
function bindBookDialogSubmit(
    form: HTMLFormElement,
    refs: BookFormRefs,
    onSubmit: (payload: BookSubmitPayload) => Promise<void> | void,
    onComplete: () => void,
): void {
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        setSavingState(refs, true);
        const PAYLOAD = {
            applyScheduledDaysToShelf:
                refs.applyScheduledDaysToShelfInput.checked,
            book: parseFormBook(refs),
        };
        Promise.resolve(onSubmit(PAYLOAD))
            .then(() => {
                onComplete();
            })
            .catch((error: unknown) => {
                refs.lookupMeta.textContent = saveErrorMessage(error);
                if (!focusFirstError(refs.form)) {
                    refs.titleInput.focus();
                }
            })
            .finally(() => {
                setSavingState(refs, false);
            });
    });
}

/**
 * Binds close button handlers for book dialog.
 */
function bindBookDialogCloseHandlers(
    dialog: HTMLDialogElement,
    cancelBtn: HTMLButtonElement,
    onClose: () => void,
): void {
    cancelBtn.onclick = (): void => {
        onClose();
    };
    dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        onClose();
    });
}

export function createBookDialog(
    onSubmit: (payload: BookSubmitPayload) => Promise<void> | void,
    options: BookDialogOptions = {},
): BookDialogController {
    const GET_BOOKS = booksGetter(options);
    ensureBookFormLayoutFields();
    const REFS = getBookFormRefs();
    bindShelfPicker(REFS);
    bindCoverUpload(REFS);
    const AFTER_BOOK_PICKER = createAfterBookPicker(REFS, GET_BOOKS);
    const DIALOG_FOCUS = bindDialogFocus(REFS.dialog, {
        initialFocusSelector: "#bookTitleInput",
    });
    const LOOKUP_CONTROL = bindBookLookup({
        metaEl: REFS.lookupMeta,
        onPick: (item) => {
            applyLookupItem(REFS, item);
        },
        resultsEl: REFS.searchResults,
        searchInput: REFS.searchInput,
    });
    const CLOSE = (): void => {
        DIALOG_FOCUS.closeAndReturnFocus();
    };
    const OPEN = (
        book: Book | null = null,
        dialogOptions: OpenDialogOptions = {},
    ): void => {
        openBookDialog({
            afterBookPicker: AFTER_BOOK_PICKER,
            book,
            dialogFocus: DIALOG_FOCUS,
            dialogOptions,
            getBooks: GET_BOOKS,
            lookupControl: LOOKUP_CONTROL,
            refs: REFS,
        });
    };

    bindBookDialogSubmit(REFS.form, REFS, onSubmit, CLOSE);
    bindBookDialogCloseHandlers(REFS.dialog, REFS.cancelBtn, CLOSE);
    bindBookDialogProgressSync(REFS);
    return { open: OPEN };
}
