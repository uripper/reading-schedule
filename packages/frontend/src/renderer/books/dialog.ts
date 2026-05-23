/**
 * Creates and opens the add/edit book dialog, wiring lookup, submit, and close behavior.
 */

import type {
    Book,
    BookDialogController,
    BookDialogOptions,
    BookDialogSubmitPayload,
    OpenDialogOptions,
} from "../../types/types.ts";
import { bindDialogFocus } from "../accessibility/a11y.ts";
import { bindBookLookup } from "../book_lookup/search.ts";
import { bindDateInput } from "../date_control.ts";
import { createAfterBookPicker } from "./after_book_picker.ts";
import { bindBulkEditDirtyTracking } from "./bulk-edit-form.ts";
import { bindCoverUpload } from "./cover_upload.ts";
import { bindBookDialogProgressSync } from "./dialog_progress_sync.ts";
import { bindBookDialogSubmit } from "./dialog_submit.ts";
import type { BookDialogNavigationRefs } from "./dialog-navigation.ts";
import {
    bindBookDialogNavigation,
    ensureBookDialogNavigation,
} from "./dialog-navigation.ts";
import { navigateVisibleBook } from "./dialog-navigation-flow.ts";
import { openBookDialog, unlockBookDialogScroll } from "./dialog-open.ts";
import type { DialogSessionState } from "./dialog-session.ts";
import {
    createDialogSessionState,
    dialogSubmitPayload,
} from "./dialog-session.ts";
import { ensureBookFormLayoutFields } from "./form_layout.ts";
import { getBookFormRefs } from "./form_refs.ts";
import { applyLookupItem } from "./form-state-lookup.ts";
import { bindShelfPicker } from "./shelf_picker.ts";

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
    dialog.addEventListener("close", () => {
        unlockBookDialogScroll();
    });
}

function initializeBookDialogRefs(): ReturnType<typeof getBookFormRefs> {
    ensureBookFormLayoutFields();
    const REFS = getBookFormRefs();
    bindDateInput(REFS.deadlineInput, {
        placeholder: "No deadline selected",
    });
    bindDateInput(REFS.finishedAtInput, {
        placeholder: "No finish date selected",
    });
    bindShelfPicker(REFS);
    bindCoverUpload(REFS);
    bindBulkEditDirtyTracking(REFS);
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
    navigation: BookDialogNavigationRefs;
    refs: ReturnType<typeof getBookFormRefs>;
    sessionState: DialogSessionState;
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
            navigation: options.navigation,
            refs: options.refs,
            sessionState: options.sessionState,
        });
    };
}

function createBookDialogHandlers(options: {
    getBooks: () => Book[];
    onSubmit: (payload: BookDialogSubmitPayload) => Promise<void> | void;
    refs: ReturnType<typeof getBookFormRefs>;
    sessionState: DialogSessionState;
}): {
    close: () => void;
    open: BookDialogController["open"];
} {
    const REFS = options.refs;
    const AFTER_BOOK_PICKER = createAfterBookPicker(REFS, options.getBooks);
    const DIALOG_FOCUS = bindDialogFocus(REFS.dialog, {
        initialFocusSelector: "#bookTitleInput",
    });
    const LOOKUP_CONTROL = createLookupControl(REFS);
    const NAVIGATION = ensureBookDialogNavigation(REFS);
    const CLOSE = (): void => {
        DIALOG_FOCUS.closeAndReturnFocus();
    };
    const OPEN = createOpenHandler({
        afterBookPicker: AFTER_BOOK_PICKER,
        dialogFocus: DIALOG_FOCUS,
        getBooks: options.getBooks,
        lookupControl: LOOKUP_CONTROL,
        navigation: NAVIGATION,
        refs: REFS,
        sessionState: options.sessionState,
    });
    bindNavigationHandler({ ...options, navigation: NAVIGATION, open: OPEN });
    return { close: CLOSE, open: OPEN };
}

function bindNavigationHandler(options: {
    getBooks: () => Book[];
    navigation: BookDialogNavigationRefs;
    onSubmit: (payload: BookDialogSubmitPayload) => Promise<void> | void;
    open: BookDialogController["open"];
    refs: ReturnType<typeof getBookFormRefs>;
    sessionState: DialogSessionState;
}): void {
    bindBookDialogNavigation(options.navigation, (direction) => {
        navigateVisibleBook({
            direction,
            getBooks: options.getBooks,
            onSubmit: options.onSubmit,
            open: options.open,
            refs: options.refs,
            sessionState: options.sessionState,
        }).catch(() => {
            return undefined;
        });
    });
}

function bindDialogInteractions(options: {
    close: () => void;
    createPayload: () => BookDialogSubmitPayload;
    onSubmit: (payload: BookDialogSubmitPayload) => Promise<void> | void;
    refs: ReturnType<typeof getBookFormRefs>;
}): void {
    bindBookDialogSubmit({
        createPayload: options.createPayload,
        form: options.refs.form,
        onComplete: options.close,
        onSubmit: options.onSubmit,
        refs: options.refs,
    });
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
    onSubmit: (payload: BookDialogSubmitPayload) => Promise<void> | void,
    options: BookDialogOptions = {},
): BookDialogController {
    const GET_BOOKS = booksGetter(options);
    const REFS = initializeBookDialogRefs();
    const SESSION_STATE = createDialogSessionState();
    const HANDLERS = createBookDialogHandlers({
        getBooks: GET_BOOKS,
        onSubmit,
        refs: REFS,
        sessionState: SESSION_STATE,
    });
    bindDialogInteractions({
        close: HANDLERS.close,
        createPayload: () => dialogSubmitPayload(REFS, SESSION_STATE),
        onSubmit,
        refs: REFS,
    });
    return { open: HANDLERS.open };
}
