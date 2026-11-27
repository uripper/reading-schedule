/**
 * Workspace field of the book dialog, used by single and bulk edits alike.
 *
 * One workspace open: the field starts on it, so new books land there. All
 * Workspaces: an existing book starts on its own workspace, a new book must pick one
 * before it can be saved, and bulk edits start on "Keep current workspaces".
 * Choosing another workspace for existing books saves the edits, then moves them.
 */
import type {
    BookDialogSubmitPayload,
    WorkspaceRuntime,
} from "../../types/types.ts";
import {
    setBookSavePreparer,
    setBookSaveHook,
} from "../books/book-save-hook.ts";
import { isBulkBookSubmitPayload } from "../books/bulk-edit-updates.ts";
import { el } from "../dom.ts";
import { fillWorkspaceOptions } from "./workspace-selector.ts";
import {
    activeWorkspaceId,
    assignNewBookWorkspace,
    bookWorkspaceId,
    isViewingAllWorkspaces,
    onWorkspaceCatalogChanged,
    usableWorkspaces,
} from "./workspace-store.ts";

const FIELD_ID = "bookWorkspaceField";
const SELECT_ID = "bookWorkspaceSelect";
const BOOK_ID_INPUT_ID = "bookFormId";
const DIALOG_ID = "bookDialog";
const BULK_FORM_SELECTOR = "#bookForm.is-bulk-book-form";
const MIN_WORKSPACES_FOR_FIELD = 2;
const CHOOSE_LABEL = "Choose a workspace";
const KEEP_LABEL = "Keep current workspaces";

/** Inserts the Workspace select at the top of the shelf section. */
function createField(): HTMLSelectElement {
    const LABEL = document.createElement("label");
    LABEL.id = FIELD_ID;
    LABEL.textContent = "Workspace";
    const SELECT = document.createElement("select");
    SELECT.id = SELECT_ID;
    LABEL.append(SELECT);
    el("bookShelfCollectionsFields").prepend(LABEL);
    return SELECT;
}

/** Adds the leading "no choice yet" option. */
function prependPlaceholder(select: HTMLSelectElement, label: string): void {
    const OPTION = document.createElement("option");
    OPTION.value = "";
    OPTION.textContent = label;
    select.prepend(OPTION);
}

/** Workspace the open book is in, or null for a new book. */
function openBookWorkspace(): string | null {
    const BOOK_ID = el<HTMLInputElement>(BOOK_ID_INPUT_ID).value.trim();
    if (BOOK_ID === "") {
        return null;
    }
    return bookWorkspaceId(BOOK_ID);
}

/** Fills the field for whatever the dialog currently shows. */
function refreshField(select: HTMLSelectElement): void {
    const WORKSPACES = usableWorkspaces();
    const IS_BULK = document.querySelector(BULK_FORM_SELECTOR) !== null;
    const OWNER = openBookWorkspace();
    fillWorkspaceOptions(select, WORKSPACES, OWNER ?? activeWorkspaceId());
    if (IS_BULK) {
        prependPlaceholder(select, KEEP_LABEL);
        select.value = "";
    } else if (OWNER === null && isViewingAllWorkspaces()) {
        prependPlaceholder(select, CHOOSE_LABEL);
        select.value = "";
    }
    el(FIELD_ID).hidden = WORKSPACES.length < MIN_WORKSPACES_FOR_FIELD;
}

/** New books saved from All Workspaces need an explicit destination. */
function prepareSave(
    select: HTMLSelectElement,
    payload: BookDialogSubmitPayload,
): void {
    if (isBulkBookSubmitPayload(payload) || !isViewingAllWorkspaces()) {
        return;
    }
    const BOOK_ID = payload.book.book_id;
    if (bookWorkspaceId(BOOK_ID) !== null) {
        return;
    }
    if (select.value === "") {
        select.focus();
        throw new Error("Choose a workspace for this book.");
    }
    assignNewBookWorkspace(BOOK_ID, select.value);
}

/** Lists the books a single or bulk dialog save just committed. */
function savedBookIds(payload: BookDialogSubmitPayload): string[] {
    if (isBulkBookSubmitPayload(payload)) {
        return [...payload.bookIds];
    }
    return [payload.book.book_id];
}

/** Moves the saved books once the dialog closes, if another workspace was chosen. */
function handleSaved(
    select: HTMLSelectElement,
    payload: BookDialogSubmitPayload,
    moveBooks: WorkspaceRuntime["moveBooks"],
): void {
    const TARGET_ID = select.value;
    const BOOK_IDS = savedBookIds(payload).filter(
        (bookId) => bookWorkspaceId(bookId) !== TARGET_ID,
    );
    if (TARGET_ID === "" || BOOK_IDS.length === 0) {
        return;
    }
    const RUN = (): void => {
        moveBooks(BOOK_IDS, TARGET_ID).catch(() => {
            refreshField(select);
        });
    };
    const DIALOG = el<HTMLDialogElement>(DIALOG_ID);
    if (!DIALOG.open) {
        RUN();
        return;
    }
    // Moving waits for the dialog to close so the transfer sees the committed books.
    DIALOG.addEventListener("close", RUN, { once: true });
}

/** Refills the field whenever the dialog opens. */
function observeDialogOpen(select: HTMLSelectElement): void {
    const DIALOG = el<HTMLDialogElement>(DIALOG_ID);
    new MutationObserver((): void => {
        if (DIALOG.open) {
            refreshField(select);
        }
    }).observe(DIALOG, { attributeFilter: ["open"], attributes: true });
}

/**
 * Installs the Workspace field, its new-book check, and its post-save transfer.
 * @param moveBooks - Transfers saved books to the chosen workspace.
 */
export function bindBookDialogWorkspaceField(
    moveBooks: WorkspaceRuntime["moveBooks"],
): void {
    const SELECT = createField();
    refreshField(SELECT);
    observeDialogOpen(SELECT);
    onWorkspaceCatalogChanged((): void => {
        refreshField(SELECT);
    });
    setBookSavePreparer((payload): void => {
        prepareSave(SELECT, payload);
    });
    setBookSaveHook((payload): void => {
        handleSaved(SELECT, payload, moveBooks);
    });
}
