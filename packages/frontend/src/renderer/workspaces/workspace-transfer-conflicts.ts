/**
 * Resolves After Book links that a transfer would split across workspaces.
 *
 * Dependencies never cross workspaces and are never removed silently: the user
 * either moves the linked books together, removes the links explicitly, or cancels.
 */
import type {
    WorkspaceConflictResolution,
    WorkspaceDependencyConflict,
} from "../../types/types.ts";
import { getBookById } from "../books/controller.ts";
import { confirmAction } from "../confirm/action-confirm.ts";

/** Looks up a book title in the active library for conflict messages. */
function titleOf(bookId: string): string {
    return getBookById(bookId)?.title ?? "an untitled book";
}

/** The staying book on the other end of a conflicting link. */
export function conflictPartnerId(
    conflict: WorkspaceDependencyConflict,
): string {
    if (conflict.direction === "outgoing") {
        return conflict.blockedById;
    }
    return conflict.bookId;
}

/** Describes one conflicting reading-order link. */
function conflictLine(conflict: WorkspaceDependencyConflict): string {
    return `"${titleOf(conflict.bookId)}" comes after "${titleOf(conflict.blockedById)}"`;
}

/** Adds every linked book so the moving set has no outside links. */
export function withLinkedBooks(
    bookIds: readonly string[],
    conflicts: readonly WorkspaceDependencyConflict[],
): string[] {
    const IDS = new Set(bookIds);
    for (const CONFLICT of conflicts) {
        IDS.add(conflictPartnerId(CONFLICT));
    }
    return [...IDS];
}

/**
 * Asks how to handle links that would cross workspaces.
 * @param bookIds - Books the user chose to move.
 * @param conflicts - Links reported by the host.
 * @returns The retry request, or null when the user cancels the move.
 */
export async function resolveTransferConflicts(
    bookIds: readonly string[],
    conflicts: readonly WorkspaceDependencyConflict[],
): Promise<WorkspaceConflictResolution | null> {
    const LINES = conflicts.map(conflictLine).join("; ");
    const MOVE_TOGETHER = await confirmAction({
        cancelLabel: "Other options",
        confirmLabel: "Move linked books too",
        message: `Reading order links would cross workspaces: ${LINES}. Move the linked books together to keep the order?`,
        title: "Linked books",
    });
    if (MOVE_TOGETHER) {
        return {
            bookIds: withLinkedBooks(bookIds, conflicts),
            dependencyPolicy: "reject",
        };
    }
    const REMOVE_LINKS = await confirmAction({
        confirmLabel: "Remove links and move",
        confirmStyle: "remove",
        message: `Remove these After Book links and move only the selected books? ${LINES}.`,
        title: "Remove reading order links?",
    });
    if (!REMOVE_LINKS) {
        return null;
    }
    return { bookIds: [...bookIds], dependencyPolicy: "remove" };
}
