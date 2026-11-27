/**
 * Mutations behind Settings → Workspaces: open, rename, archive or restore,
 * delete, and create.
 *
 * One mutation runs at a time. Any change that can touch the active workspace
 * (archiving or deleting it, or moving a deleted workspace's books into it)
 * first flushes pending saves and aborts if that fails; afterwards the active
 * workspace is reloaded so the renderer shows whatever the host now has active.
 * Host errors are surfaced in the status bar.
 */
import type { WorkspaceCreateRequest, WorkspaceId } from "../../types/types.ts";
import type { WorkspaceRuntime } from "../../types/types.ts";
import { todayDayKey } from "../app/date_keys.ts";
import { chooseWorkspaceDelete } from "./workspace-settings-delete.ts";
import { normalizedWorkspaceName } from "./workspace-settings-model.ts";
import {
    applyCatalog,
    readyToChange,
    runMutation,
} from "./workspace-settings-mutation.ts";
import {
    activeWorkspaceId,
    setWorkspaceCatalog,
    workspaceById,
    workspaceCatalog,
} from "./workspace-store.ts";

/** True when deleting changes the active workspace or moves books into it. */
function deleteTouchesActive(
    workspaceId: WorkspaceId,
    transferBooksTo: WorkspaceId | null,
): boolean {
    const ACTIVE_ID = activeWorkspaceId();
    return workspaceId === ACTIVE_ID || transferBooksTo === ACTIVE_ID;
}

/**
 * Opens a workspace from its settings row.
 * @param runtime - Workspace runtime.
 * @param workspaceId - Workspace to open.
 */
export async function openWorkspaceFromSettings(
    runtime: WorkspaceRuntime,
    workspaceId: WorkspaceId,
): Promise<void> {
    await runMutation(runtime, async () => await runtime.switchTo(workspaceId));
}

/**
 * Renames a workspace from its name input; reverts the input on failure.
 * @param runtime - Workspace runtime.
 * @param workspaceId - Workspace to rename.
 * @param input - Name input holding the typed name.
 */
export async function renameWorkspaceFromSettings(
    runtime: WorkspaceRuntime,
    workspaceId: WorkspaceId,
    input: HTMLInputElement,
): Promise<void> {
    const INPUT = input;
    const PREVIOUS = workspaceById(workspaceId)?.name ?? INPUT.defaultValue;
    const NAME = normalizedWorkspaceName(INPUT.value);
    if (NAME === null || NAME === PREVIOUS) {
        INPUT.value = PREVIOUS;
        return;
    }
    const RENAMED = await runMutation(runtime, async () => {
        setWorkspaceCatalog(await runtime.deps.api.rename(workspaceId, NAME));
        runtime.deps.context.announce(`Renamed ${PREVIOUS} to ${NAME}.`);
        return true;
    });
    if (!RENAMED) {
        INPUT.value = PREVIOUS;
    }
}

/**
 * Archives or restores a workspace.
 * @param runtime - Workspace runtime.
 * @param workspaceId - Workspace to change.
 * @param archived - True to archive, false to restore.
 */
export async function archiveWorkspaceFromSettings(
    runtime: WorkspaceRuntime,
    workspaceId: WorkspaceId,
    archived: boolean,
): Promise<void> {
    const NAME = workspaceById(workspaceId)?.name ?? "Workspace";
    const TOUCHES_ACTIVE = workspaceId === activeWorkspaceId();
    await runMutation(runtime, async () => {
        if (!(await readyToChange(runtime, TOUCHES_ACTIVE))) {
            return false;
        }
        const CATALOG = await runtime.deps.api.setArchived(
            workspaceId,
            archived,
        );
        await applyCatalog(runtime, CATALOG, TOUCHES_ACTIVE);
        let verb = "Restored";
        if (archived) {
            verb = "Archived";
        }
        runtime.deps.context.announce(`${verb} ${NAME}.`);
        return true;
    });
}

/** Confirms and performs a delete; resolves false when nothing changed. */
async function performDelete(
    runtime: WorkspaceRuntime,
    workspaceId: WorkspaceId,
): Promise<boolean> {
    const CATALOG = workspaceCatalog();
    const WORKSPACE = workspaceById(workspaceId);
    if (CATALOG === null || WORKSPACE === null) {
        return false;
    }
    const CHOICE = await chooseWorkspaceDelete(CATALOG, WORKSPACE);
    if (CHOICE.kind === "cancel") {
        return false;
    }
    const TOUCHES_ACTIVE = deleteTouchesActive(
        workspaceId,
        CHOICE.transferBooksTo,
    );
    if (!(await readyToChange(runtime, TOUCHES_ACTIVE))) {
        return false;
    }
    const NEXT = await runtime.deps.api.remove({
        today: todayDayKey(),
        transferBooksTo: CHOICE.transferBooksTo,
        workspaceId,
    });
    await applyCatalog(runtime, NEXT, TOUCHES_ACTIVE);
    runtime.deps.context.announce(`Deleted ${WORKSPACE.name}.`);
    return true;
}

/**
 * Deletes a workspace after confirmation, optionally moving its books first.
 * @param runtime - Workspace runtime.
 * @param workspaceId - Workspace to delete.
 */
export async function deleteWorkspaceFromSettings(
    runtime: WorkspaceRuntime,
    workspaceId: WorkspaceId,
): Promise<void> {
    await runMutation(
        runtime,
        async () => await performDelete(runtime, workspaceId),
    );
}

/**
 * Creates a workspace and opens it.
 * @param runtime - Workspace runtime.
 * @param request - Name and optional settings source.
 * @returns True when the workspace was created.
 */
export async function createWorkspaceFromSettings(
    runtime: WorkspaceRuntime,
    request: WorkspaceCreateRequest,
): Promise<boolean> {
    return await runMutation(runtime, async () => {
        const CREATED = await runtime.deps.api.create(request);
        setWorkspaceCatalog(CREATED.catalog);
        if (await runtime.switchTo(CREATED.workspaceId)) {
            runtime.deps.context.announce(
                `Created and opened ${request.name}.`,
            );
            return true;
        }
        runtime.deps.context.announce(`Created ${request.name}.`);
        return true;
    });
}
