/**
 * Confirmation flow for deleting a workspace from Settings → Workspaces.
 *
 * A workspace with books first offers to move them to another usable workspace;
 * declining falls through to a destructive confirmation that deletes the books
 * too. Either way, the deleted workspace's reading history is removed.
 */
import type {
    WorkspaceCatalog,
    WorkspaceDeleteChoice,
    WorkspaceId,
    WorkspaceSummary,
} from "../../types/types.ts";
import {
    confirmAction,
    confirmDestructiveAction,
} from "../confirm/action-confirm.ts";
import {
    deleteDestination,
    workspaceInfoText,
} from "./workspace-settings-model.ts";

const DELETE_TITLE = "Delete Workspace";
const HISTORY_NOTE =
    "Its reading history (sessions, completed sessions, and stats) is removed.";
const CANCELLED: WorkspaceDeleteChoice = { kind: "cancel" };

/** Turns a confirmation answer into a delete choice. */
function deleteChoice(
    confirmed: boolean,
    transferBooksTo: WorkspaceId | null,
): WorkspaceDeleteChoice {
    if (!confirmed) {
        return CANCELLED;
    }
    return { kind: "delete", transferBooksTo };
}

/** Offers to move the books to another workspace before deleting. */
async function confirmMoveBooks(
    workspace: WorkspaceSummary,
    destination: WorkspaceSummary,
): Promise<boolean> {
    return await confirmAction({
        cancelLabel: "Do Not Move",
        confirmLabel: "Move Books and Delete",
        confirmStyle: "remove",
        message: `Move the books of "${workspace.name}" (${workspaceInfoText(workspace)}) to "${destination.name}" before deleting it? Moved books keep their progress.`,
        title: DELETE_TITLE,
        warning: `Reading history of "${workspace.name}" (sessions, completed sessions, and stats) is removed.`,
    });
}

/** Confirms deleting the workspace together with any books it holds. */
async function confirmDeleteWithBooks(
    workspace: WorkspaceSummary,
): Promise<boolean> {
    let books = "";
    if (workspace.bookCount > 0) {
        books = " and all of its books";
    }
    return await confirmDestructiveAction({
        confirmLabel: "Delete",
        message: `Delete "${workspace.name}"${books}? ${HISTORY_NOTE}`,
        title: DELETE_TITLE,
    });
}

/**
 * Asks how to delete a workspace.
 * @param catalog - Latest catalog from the host.
 * @param workspace - Workspace being deleted.
 * @returns Cancel, or delete with an optional book destination.
 */
export async function chooseWorkspaceDelete(
    catalog: WorkspaceCatalog,
    workspace: WorkspaceSummary,
): Promise<WorkspaceDeleteChoice> {
    const DESTINATION = deleteDestination(catalog, workspace.id);
    if (
        DESTINATION !== null &&
        (await confirmMoveBooks(workspace, DESTINATION))
    ) {
        return deleteChoice(true, DESTINATION.id);
    }
    return deleteChoice(await confirmDeleteWithBooks(workspace), null);
}
