/**
 * Moves books from the workspace on screen to another one, with undo.
 *
 * Pending saves are flushed first so the host transfers exactly what is on screen;
 * the active workspace is then reloaded from the host, which also refreshes its save
 * revision, and replans because books left it.
 */
import type {
    WorkspaceId,
    WorkspaceSwitchDeps,
    WorkspaceTransferMoved,
    WorkspaceTransferRequest,
} from "../../types/types.ts";
import { withAppLoading } from "../app/app-loading.ts";
import { todayDayKey } from "../app/date_keys.ts";
import { confirmAction } from "../confirm/action-confirm.ts";
import {
    activeWorkspaceId,
    setWorkspaceCatalog,
    workspaceById,
} from "./workspace-store.ts";
import { reloadActiveWorkspace } from "./workspace-switch.ts";
import {
    resolveTransferConflicts,
    withLinkedBooks,
} from "./workspace-transfer-conflicts.ts";

const MAX_LINKED_EXPANSIONS = 50;

/** Returns a workspace name for user-facing messages. */
function nameOf(workspaceId: WorkspaceId): string {
    return workspaceById(workspaceId)?.name ?? "the other workspace";
}

/** Formats a book count with the right plural. */
function bookCountText(count: number): string {
    if (count === 1) {
        return "1 book";
    }
    return `${count} books`;
}

/** Builds a transfer that keeps shelves and rejects split links. */
function transferRequest(
    bookIds: string[],
    sourceWorkspaceId: WorkspaceId,
    targetWorkspaceId: WorkspaceId,
): WorkspaceTransferRequest {
    return {
        bookIds,
        dependencyPolicy: "reject",
        shelfPolicy: "keep",
        sourceWorkspaceId,
        targetWorkspaceId,
        today: todayDayKey(),
    };
}

/** Sends a transfer, expanding linked books until no link would cross workspaces. */
async function sendWithLinkedBooks(
    deps: WorkspaceSwitchDeps,
    request: WorkspaceTransferRequest,
    remainingAttempts: number = MAX_LINKED_EXPANSIONS,
): Promise<WorkspaceTransferMoved> {
    if (remainingAttempts <= 0) {
        throw new Error("Too many linked books to move at once.");
    }
    const RESULT = await deps.api.transferBooks(request);
    setWorkspaceCatalog(RESULT.catalog);
    if (RESULT.outcome.status === "moved") {
        return RESULT.outcome;
    }
    const EXPANDED = {
        ...request,
        bookIds: withLinkedBooks(request.bookIds, RESULT.outcome.conflicts),
    };
    return await sendWithLinkedBooks(deps, EXPANDED, remainingAttempts - 1);
}

/** Sends a transfer and asks how to resolve split links when the host reports any. */
async function sendTransfer(
    deps: WorkspaceSwitchDeps,
    request: WorkspaceTransferRequest,
): Promise<WorkspaceTransferMoved | null> {
    const FIRST = await deps.api.transferBooks(request);
    setWorkspaceCatalog(FIRST.catalog);
    if (FIRST.outcome.status === "moved") {
        return FIRST.outcome;
    }
    const CHOICE = await resolveTransferConflicts(
        request.bookIds,
        FIRST.outcome.conflicts,
    );
    if (CHOICE === null) {
        return null;
    }
    return await sendWithLinkedBooks(deps, { ...request, ...CHOICE });
}

/** Moves each group back with its original records, newest move first. */
async function undoTransfers(
    deps: WorkspaceSwitchDeps,
    moves: readonly WorkspaceTransferMoved[],
): Promise<boolean> {
    const [LAST, ...EARLIER] = [...moves].reverse();
    if (LAST === undefined) {
        return true;
    }
    const RESULT = await deps.api.transferBooks(LAST.undo);
    setWorkspaceCatalog(RESULT.catalog);
    if (RESULT.outcome.status !== "moved") {
        return false;
    }
    return await undoTransfers(deps, EARLIER.reverse());
}

/** Undoes a move and reloads what is shown. */
async function undoMove(
    deps: WorkspaceSwitchDeps,
    moves: readonly WorkspaceTransferMoved[],
): Promise<void> {
    const UNDONE = await withAppLoading("Moving books back…", async () => {
        const RESULT = await undoTransfers(deps, moves);
        await reloadActiveWorkspace(deps);
        return RESULT;
    });
    if (!UNDONE) {
        deps.context.setStatus(
            "Undo stopped: a book in the other workspace now depends on a moved book. Remove that link, then move the books back.",
            true,
        );
        return;
    }
    deps.context.setStatus("Move undone.");
}

/** Reports the move, explains where history stays, and offers to undo it. */
async function offerUndo(
    deps: WorkspaceSwitchDeps,
    moves: readonly WorkspaceTransferMoved[],
    targetWorkspaceId: WorkspaceId,
): Promise<void> {
    const COUNT = moves.reduce(
        (total, move) => total + move.movedBookIds.length,
        0,
    );
    const SOURCES = moves
        .map((move) => nameOf(move.undo.targetWorkspaceId))
        .join(", ");
    const SUMMARY = `${bookCountText(COUNT)} moved to ${nameOf(targetWorkspaceId)}.`;
    deps.context.setStatus(SUMMARY);
    const UNDO = await confirmAction({
        cancelLabel: "Keep",
        confirmLabel: "Undo move",
        message: `${SUMMARY} Progress and book settings moved with them; reading history stays in ${SOURCES}.`,
        title: "Books moved",
    });
    if (UNDO) {
        await undoMove(deps, moves);
    }
}

/** The books to move, keyed by the workspace on screen they leave. */
function booksBySource(
    bookIds: readonly string[],
    targetWorkspaceId: WorkspaceId,
): Map<WorkspaceId, string[]> {
    const SOURCE_ID = activeWorkspaceId();
    if (SOURCE_ID === null || SOURCE_ID === targetWorkspaceId) {
        return new Map();
    }
    return new Map([[SOURCE_ID, [...bookIds]]]);
}

/** Transfers each source group in turn; stops when the user cancels a group. */
async function sendGroups(
    deps: WorkspaceSwitchDeps,
    groups: readonly (readonly [WorkspaceId, string[]])[],
    targetWorkspaceId: WorkspaceId,
): Promise<WorkspaceTransferMoved[]> {
    const [FIRST, ...REST] = groups;
    if (FIRST === undefined) {
        return [];
    }
    const MOVED = await sendTransfer(
        deps,
        transferRequest(FIRST[1], FIRST[0], targetWorkspaceId),
    );
    if (MOVED === null) {
        return [];
    }
    return [MOVED, ...(await sendGroups(deps, REST, targetWorkspaceId))];
}

/** Saves, transfers every group, reloads what is shown, and offers undo. */
async function runTransfer(
    deps: WorkspaceSwitchDeps,
    bookIds: string[],
    targetWorkspaceId: WorkspaceId,
): Promise<void> {
    const GROUPS = [...booksBySource(bookIds, targetWorkspaceId)];
    if (GROUPS.length === 0) {
        deps.context.setStatus(`Already in ${nameOf(targetWorkspaceId)}.`);
        return;
    }
    if (!(await deps.context.flushPendingChanges())) {
        deps.context.setStatus(
            "Save failed, so no books were moved. Retry the save first.",
            true,
        );
        return;
    }
    const MOVES = await withAppLoading("Moving books…", async () => {
        const RESULT = await sendGroups(deps, GROUPS, targetWorkspaceId);
        await reloadActiveWorkspace(deps);
        return RESULT;
    });
    if (MOVES.length === 0) {
        deps.context.setStatus("Move cancelled.");
        return;
    }
    await offerUndo(deps, MOVES, targetWorkspaceId);
}

/**
 * Moves books from their workspaces to another one; failures lose no data.
 * @param deps - Renderer wiring for saving, transfer, and reload.
 * @param bookIds - Books to move.
 * @param targetWorkspaceId - Destination workspace.
 */
export async function moveBooksToWorkspace(
    deps: WorkspaceSwitchDeps,
    bookIds: string[],
    targetWorkspaceId: WorkspaceId,
): Promise<void> {
    try {
        await runTransfer(deps, bookIds, targetWorkspaceId);
    } catch (error) {
        let message = "Unknown error.";
        if (typeof error === "string") {
            message = error;
        } else if (error instanceof Error) {
            message = error.message;
        }
        deps.context.setStatus(`Books were not moved: ${message}`, true);
    }
}
