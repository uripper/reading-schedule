// audit-allow-local-types: Save session and invoke signature depend on app-local Tauri command names.
/**
 * Tauri-backed workspace API and the save session that guards against stale writes.
 *
 * The session remembers which workspace the renderer currently shows and the
 * revision it was loaded at. Every save carries both, so the native runtime rejects
 * a save aimed at a deleted workspace or one that raced a newer write, such as a
 * book transfer. Only loads the renderer applies (the startup load, `load`, `loadAll`)
 * move the session; plain reads for aggregate views never do.
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

/** Workspace and revision the renderer's next save targets. */
interface WorkspaceSaveSession {
    revision: number | null;
    /** Per-workspace revisions while the All Workspaces view is open. */
    revisions: Record<string, number> | null;
    workspaceId: string | null;
}

const SESSION: WorkspaceSaveSession = {
    revision: null,
    revisions: null,
    workspaceId: null,
};

/** Points future saves at the workspace whose snapshot the renderer just applied. */
export function rememberLoadedWorkspace(
    meta: WorkspaceLoadMeta | undefined,
): void {
    if (meta === undefined) {
        return;
    }
    SESSION.revision = meta.revision;
    SESSION.revisions = meta.combined?.revisions ?? null;
    SESSION.workspaceId = meta.workspaceId;
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

/** Saves the active workspace and reports native rejections as recoverable results. */
export async function saveWorkspaceState(
    invokeCommand: InvokeCommand,
    state: PlannerStateSnapshot,
): Promise<PlannerSaveResult> {
    try {
        const RESULT = await invokeCommand<unknown>(TAURI_COMMANDS.stateSave, {
            request: {
                expectedRevision: SESSION.revision,
                expectedRevisions: SESSION.revisions,
                state,
                workspaceId: SESSION.workspaceId,
            },
        });
        const OUTCOME = parseWorkspaceSaveOutcome(RESULT);
        SESSION.revision = OUTCOME.revision;
        SESSION.revisions = OUTCOME.revisions ?? null;
        SESSION.workspaceId = OUTCOME.workspaceId;
        return { ok: true, warningMessage: OUTCOME.warningMessage };
    } catch (error) {
        return { error: errorText(error), ok: false };
    }
}

/** Reads a workspace (or every workspace) the renderer will show; saves follow it. */
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
        loadAll: async () =>
            await loadShownWorkspace(
                invokeCommand,
                TAURI_COMMANDS.workspaceLoadAll,
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
