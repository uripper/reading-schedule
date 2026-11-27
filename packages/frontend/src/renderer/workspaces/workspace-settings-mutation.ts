/**
 * Shared plumbing for Settings → Workspaces mutations: a single in-flight guard
 * with status-bar error reporting, the pending-save flush required before any
 * change to the active workspace, and catalog application with an active reload.
 */
import type { WorkspaceCatalog } from "../../types/types.ts";
import type { WorkspaceRuntime } from "../../types/types.ts";
import { workspaceErrorText } from "./workspace-settings-model.ts";
import { setWorkspaceCatalog } from "./workspace-store.ts";

let mutationInFlight = false;

/**
 * Runs one workspace mutation at a time and reports host errors.
 * @param runtime - Workspace runtime.
 * @param work - Mutation; resolves true when it changed something.
 * @returns The mutation's result, or false when refused or failed.
 */
export async function runMutation(
    runtime: WorkspaceRuntime,
    work: () => Promise<boolean>,
): Promise<boolean> {
    if (mutationInFlight) {
        runtime.deps.context.setStatus(
            "Wait for the current workspace change to finish.",
            true,
        );
        return false;
    }
    mutationInFlight = true;
    try {
        return await work();
    } catch (error) {
        runtime.deps.context.setStatus(workspaceErrorText(error), true);
        return false;
    } finally {
        mutationInFlight = false;
    }
}

/** Saves pending changes of the active workspace, reporting a failed save. */
async function flushActive(runtime: WorkspaceRuntime): Promise<boolean> {
    if (await runtime.deps.context.flushPendingChanges()) {
        return true;
    }
    runtime.deps.context.setStatus(
        "Bartleby could not save the active workspace, so nothing changed. Retry the save first.",
        true,
    );
    return false;
}

/**
 * Flushes pending saves only when the change can touch the active workspace.
 * @param runtime - Workspace runtime.
 * @param touchesActive - Whether the change can alter the active workspace.
 * @returns False when the flush failed and the change must not run.
 */
export async function readyToChange(
    runtime: WorkspaceRuntime,
    touchesActive: boolean,
): Promise<boolean> {
    if (!touchesActive) {
        return true;
    }
    return await flushActive(runtime);
}

/**
 * Stores a returned catalog and reloads the active workspace when it changed.
 * @param runtime - Workspace runtime.
 * @param catalog - Catalog returned by the host.
 * @param touchedActive - Whether the change altered the active workspace.
 */
export async function applyCatalog(
    runtime: WorkspaceRuntime,
    catalog: WorkspaceCatalog,
    touchedActive: boolean,
): Promise<void> {
    setWorkspaceCatalog(catalog);
    if (touchedActive) {
        await runtime.reloadActive();
    }
}
