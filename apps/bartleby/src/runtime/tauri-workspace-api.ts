// audit-allow-local-types: Save session and invoke signature depend on app-local Tauri command names.
/**
 * Tauri-backed workspace API and the revision bookkeeping that guards saves.
 *
 * A save goes to the workspace named on the data itself (`workspace_id`, set by the
 * renderer only after that workspace's data is on screen), never to whichever
 * workspace was loaded last, so loading one workspace can never redirect the data of
 * another. Each save also carries the revision that workspace was loaded or last
 * saved at, so the native runtime rejects saves that raced a newer write.
 */

import type {
    HostInvoke,
    PlannerSaveResult,
    PlannerStateSnapshot,
    WorkspaceApi,
    WorkspaceLoad,
    WorkspaceLoadMeta,
} from "@reading-schedule/contracts";
import {
    parseWorkspaceCatalog,
    parseWorkspaceCreated,
    parseWorkspaceLoad,
    parseWorkspaceSaveOutcome,
    parseWorkspaceSnapshots,
    parseWorkspaceTransferResult,
} from "@reading-schedule/contracts";
import type { TauriPlannerCommand } from "./tauri-commands.ts";
import { TAURI_COMMANDS } from "./tauri-commands.ts";

/** Invokes one typed Tauri command; matches the planner adapter's helper. */
type InvokeCommand = HostInvoke<TauriPlannerCommand>;

/** Revision of each workspace as of the last load or save the renderer saw. */
const REVISIONS = new Map<string, number>();
/** Workspace the host opened at startup; used for saves of untagged data. */
let startupWorkspaceId: string | null = null;

/** Records the revision of a workspace the renderer just loaded. */
export function rememberLoadedWorkspace(
    meta: WorkspaceLoadMeta | undefined,
): void {
    if (meta === undefined) {
        return;
    }
    REVISIONS.set(meta.workspaceId, meta.revision);
    startupWorkspaceId ??= meta.workspaceId;
}

/** Known revision of a workspace, or null when none was loaded yet. */
function revisionOf(workspaceId: string | null): number | null {
    if (workspaceId === null) {
        return null;
    }
    return REVISIONS.get(workspaceId) ?? null;
}

/** Turns an invoke rejection (usually a string) into readable text. */
function errorText(error: unknown): string {
    if (typeof error === "string") {
        return error;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown state persistence error";
}

/** Saves the workspace the data belongs to; native rejections become save failures. */
export async function saveWorkspaceState(
    invokeCommand: InvokeCommand,
    state: PlannerStateSnapshot,
): Promise<PlannerSaveResult> {
    const WORKSPACE_ID = state.workspace_id ?? startupWorkspaceId;
    try {
        const RESULT = await invokeCommand<unknown>(TAURI_COMMANDS.stateSave, {
            request: {
                expectedRevision: revisionOf(WORKSPACE_ID),
                state,
                workspaceId: WORKSPACE_ID,
            },
        });
        const OUTCOME = parseWorkspaceSaveOutcome(RESULT);
        REVISIONS.set(OUTCOME.workspaceId, OUTCOME.revision);
        startupWorkspaceId ??= OUTCOME.workspaceId;
        return { ok: true, warningMessage: OUTCOME.warningMessage };
    } catch (error) {
        return { error: errorText(error), ok: false };
    }
}

/** Reads a workspace the renderer will show and records its revision. */
async function loadShownWorkspace(
    invokeCommand: InvokeCommand,
    command: TauriPlannerCommand,
    args?: Record<string, unknown>,
): Promise<WorkspaceLoad> {
    const LOADED = parseWorkspaceLoad(
        await invokeCommand<unknown>(command, args),
    );
    rememberLoadedWorkspace(LOADED);
    return LOADED;
}

/** Create, delete, rename, and archive operations. */
function lifecycleApi(
    invokeCommand: InvokeCommand,
): Pick<WorkspaceApi, "create" | "remove" | "rename" | "setArchived"> {
    return {
        create: async (request) =>
            parseWorkspaceCreated(
                await invokeCommand(TAURI_COMMANDS.workspaceCreate, {
                    request,
                }),
            ),
        remove: async (request) =>
            parseWorkspaceCatalog(
                await invokeCommand(TAURI_COMMANDS.workspaceDelete, {
                    request,
                }),
            ),
        rename: async (workspaceId, name) =>
            parseWorkspaceCatalog(
                await invokeCommand(TAURI_COMMANDS.workspaceRename, {
                    name,
                    workspaceId,
                }),
            ),
        setArchived: async (workspaceId, archived) =>
            parseWorkspaceCatalog(
                await invokeCommand(TAURI_COMMANDS.workspaceSetArchived, {
                    archived,
                    workspaceId,
                }),
            ),
    };
}

/** Catalog, snapshot, completion, and transfer operations. */
function dataApi(
    invokeCommand: InvokeCommand,
): Pick<
    WorkspaceApi,
    "list" | "setSessionCompletion" | "snapshots" | "transferBooks"
> {
    return {
        list: async () =>
            parseWorkspaceCatalog(
                await invokeCommand(TAURI_COMMANDS.workspaceList),
            ),
        setSessionCompletion: async (request) =>
            parseWorkspaceCatalog(
                await invokeCommand(
                    TAURI_COMMANDS.workspaceSetSessionCompletion,
                    { request },
                ),
            ),
        snapshots: async () =>
            parseWorkspaceSnapshots(
                await invokeCommand(TAURI_COMMANDS.workspaceSnapshots),
            ),
        transferBooks: async (request) =>
            parseWorkspaceTransferResult(
                await invokeCommand(TAURI_COMMANDS.workspaceTransferBooks, {
                    request,
                }),
            ),
    };
}

/** Builds the workspace API over the Tauri command bridge. */
export function createWorkspaceApi(invokeCommand: InvokeCommand): WorkspaceApi {
    return {
        load: async (workspaceId) =>
            await loadShownWorkspace(
                invokeCommand,
                TAURI_COMMANDS.workspaceLoad,
                {
                    workspaceId,
                },
            ),
        select: async (workspaceId) => {
            await invokeCommand<null>(TAURI_COMMANDS.workspaceSelect, {
                workspaceId,
            });
        },
        ...lifecycleApi(invokeCommand),
        ...dataApi(invokeCommand),
    };
}
