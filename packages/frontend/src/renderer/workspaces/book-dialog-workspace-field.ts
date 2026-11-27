/**
 * Workspace field of the book dialog, used by single and bulk edits alike.
 *
 * The field starts on the workspace on screen, so new books land there. Choosing
 * another workspace saves the edits first, then moves the book(s).
 */
import type {
    BookDialogSubmitPayload,
    WorkspaceRuntime,
} from "../../types/types.ts";
import { setBookSaveHook } from "../books/book-save-hook.ts";
import { isBulkBookSubmitPayload } from "../books/bulk-edit-updates.ts";
import { el } from "../dom.ts";
import { fillWorkspaceOptions } from "./workspace-selector.ts";
import {
    activeWorkspaceId,
    onWorkspaceCatalogChanged,
    usableWorkspaces,
} from "./workspace-store.ts";

const FIELD_ID = "bookWorkspaceField";
const SELECT_ID = "bookWorkspaceSelect";
const DIALOG_ID = "bookDialog";
const MIN_WORKSPACES_FOR_FIELD = 2;

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

/** Resets the field to the workspace on screen; hidden with fewer than two. */
function refreshField(select: HTMLSelectElement): void {
    const WORKSPACES = usableWorkspaces();
    fillWorkspaceOptions(select, WORKSPACES, activeWorkspaceId());
    el(FIELD_ID).hidden = WORKSPACES.length < MIN_WORKSPACES_FOR_FIELD;
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
    if (TARGET_ID === "" || TARGET_ID === activeWorkspaceId()) {
        return;
    }
    const BOOK_IDS = savedBookIds(payload);
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
 * Installs the Workspace field and its post-save transfer.
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
    setBookSaveHook((payload): void => {
        handleSaved(SELECT, payload, moveBooks);
    });
}
