/**
 * Creates and opens the add/edit book dialog, wiring lookup, submit, and close behavior.
 */

import type {
    Book,
    BookDialogController,
    BookDialogOptions,
    BookSubmitPayload,
    OpenBookDialogArgs,
    OpenDialogOptions,
} from "../../types/types.ts";
import { bindDialogFocus } from "../accessibility/a11y.ts";
import { bindBookLookup } from "../book_lookup/search.ts";
import { createAfterBookPicker } from "./after_book_picker.ts";
import { bindCoverUpload } from "./cover_upload.ts";
import { bindBookDialogProgressSync } from "./dialog_progress_sync.ts";
import {
    bindBookDialogSubmit,
    resetBookDialogSubmitState,
} from "./dialog_submit.ts";
import { ensureBookFormLayoutFields } from "./form_layout.ts";
import { getBookFormRefs } from "./form_refs.ts";
import { clearForm, fillForm } from "./form_state.ts";
import { applyLookupItem } from "./form_state_lookup.ts";
import { bindShelfPicker, renderShelfPicker } from "./shelf_picker.ts";

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
 * Opens dialog UI and applies add/edit form state.
 * @param args - Dialog open dependencies and target book state.
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
    resetBookDialogSubmitState(FORM_REFS);
    FORM_REFS.dialog.showModal();
    args.dialogFocus.focusInitialTarget();
}

/**
 * Binds close button handlers for book dialog.
 */
function bindBookDialogCloseHandlers(
    dialog: HTMLDialogElement,
    cancelBtn: HTMLButtonElement,
    onClose: () => void,
): void {
    const CANCEL_BUTTON = cancelBtn;
    CANCEL_BUTTON.onclick = (): void => {
        onClose();
    };
    dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        onClose();
    });
}

function initializeBookDialogRefs(): ReturnType<typeof getBookFormRefs> {
    ensureBookFormLayoutFields();
    const REFS = getBookFormRefs();
    bindShelfPicker(REFS);
    bindCoverUpload(REFS);
    return REFS;
}

function createLookupControl(
    refs: ReturnType<typeof getBookFormRefs>,
): ReturnType<typeof bindBookLookup> {
    return bindBookLookup({
        metaEl: refs.lookupMeta,
        onPick: (item) => {
            applyLookupItem(refs, item);
        },
        resultsEl: refs.searchResults,
        searchInput: refs.searchInput,
    });
}

function createOpenHandler(options: {
    afterBookPicker: ReturnType<typeof createAfterBookPicker>;
    dialogFocus: ReturnType<typeof bindDialogFocus>;
    getBooks: () => Book[];
    lookupControl: ReturnType<typeof bindBookLookup>;
    refs: ReturnType<typeof getBookFormRefs>;
}): BookDialogController["open"] {
    return (
        book: Book | null = null,
        dialogOptions: OpenDialogOptions = {},
    ): void => {
        openBookDialog({
            afterBookPicker: options.afterBookPicker,
            book,
            dialogFocus: options.dialogFocus,
            dialogOptions,
            getBooks: options.getBooks,
            lookupControl: options.lookupControl,
            refs: options.refs,
        });
    };
}

function bindDialogInteractions(options: {
    close: () => void;
    onSubmit: (payload: BookSubmitPayload) => Promise<void> | void;
    refs: ReturnType<typeof getBookFormRefs>;
}): void {
    bindBookDialogSubmit(
        options.refs.form,
        options.refs,
        options.onSubmit,
        options.close,
    );
    bindBookDialogCloseHandlers(
        options.refs.dialog,
        options.refs.cancelBtn,
        options.close,
    );
    bindBookDialogProgressSync(options.refs);
}

/**
 * Creates the add/edit book dialog controller and binds its form behavior.
 * @param onSubmit - Callback invoked with the parsed form payload on submit.
 * @param options - Optional dialog dependencies.
 * @returns Dialog API exposing the `open` function.
 */
export function createBookDialog(
    onSubmit: (payload: BookSubmitPayload) => Promise<void> | void,
    options: BookDialogOptions = {},
): BookDialogController {
    const GET_BOOKS = booksGetter(options);
    const REFS = initializeBookDialogRefs();
    const AFTER_BOOK_PICKER = createAfterBookPicker(REFS, GET_BOOKS);
    const DIALOG_FOCUS = bindDialogFocus(REFS.dialog, {
        initialFocusSelector: "#bookTitleInput",
    });
    const LOOKUP_CONTROL = createLookupControl(REFS);
    const CLOSE = (): void => {
        DIALOG_FOCUS.closeAndReturnFocus();
    };
    const OPEN = createOpenHandler({
        afterBookPicker: AFTER_BOOK_PICKER,
        dialogFocus: DIALOG_FOCUS,
        getBooks: GET_BOOKS,
        lookupControl: LOOKUP_CONTROL,
        refs: REFS,
    });
    bindDialogInteractions({ close: CLOSE, onSubmit, refs: REFS });
    return { open: OPEN };
}
