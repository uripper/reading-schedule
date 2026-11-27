/**
 * Renderer copy of the workspace catalog and of the workspace on screen.
 *
 * The native runtime is the source of truth; this module caches the latest catalog
 * it returned and notifies views (selector, settings, dialog) on change.
 *
 * Which workspace is shown comes from the load the renderer applied, never from a
 * catalog: opening a workspace reads it before the host records the choice, so a
 * catalog can still name the previous one. Saves are tagged with the applied
 * workspace, which is cleared while a workspace is being opened, so a save can never
 * carry one workspace's books into another.
 */
import type {
    WorkspaceCatalog,
    WorkspaceCatalogListener,
    WorkspaceId,
    WorkspaceLoadMeta,
    WorkspaceSummary,
} from "../../types/types.ts";

/** Latest catalog returned by the host; null until the first load or save. */
let currentCatalog: WorkspaceCatalog | null = null;
/** Whether the shown workspace had books moved in or out since it last planned. */
let currentNeedsReplan = false;
/** Workspace the renderer last started loading. */
let loadedWorkspaceId: WorkspaceId | null = null;
/**
 * Workspace whose data is fully on screen: undefined until the host reports one
 * (hosts without workspaces, or a first launch), null while one is being opened.
 */
let appliedWorkspace: WorkspaceId | null | undefined = undefined;
/** Views to refresh when the catalog changes. */
const LISTENERS = new Set<WorkspaceCatalogListener>();

/** Stores a catalog returned by the host and notifies subscribers. */
export function setWorkspaceCatalog(catalog: WorkspaceCatalog): void {
    currentCatalog = catalog;
    for (const LISTENER of LISTENERS) {
        LISTENER(catalog);
    }
}

/** Records the workspace whose snapshot is being applied to the screen. */
export function setLoadedWorkspace(meta: WorkspaceLoadMeta | undefined): void {
    if (meta === undefined) {
        return;
    }
    currentNeedsReplan = meta.needsReplan;
    loadedWorkspaceId = meta.workspaceId;
    setWorkspaceCatalog(meta.catalog);
}

/** Marks the screen as holding no complete workspace while one is being opened. */
export function beginApplyingWorkspace(): void {
    appliedWorkspace = null;
}

/** Marks a workspace's data as fully on screen, so saves may target it again. */
export function finishApplyingWorkspace(workspaceId: WorkspaceId): void {
    appliedWorkspace = workspaceId;
}

/** Workspace that saves belong to; see `appliedWorkspace` for null and undefined. */
export function appliedWorkspaceId(): WorkspaceId | null | undefined {
    return appliedWorkspace;
}

/** True when books moved in or out since the shown workspace last planned. */
export function loadedWorkspaceNeedsReplan(): boolean {
    return currentNeedsReplan;
}

/** Returns the cached catalog, or null before the first load. */
export function workspaceCatalog(): WorkspaceCatalog | null {
    return currentCatalog;
}

/** Returns the workspace on screen, or the host's choice if it was archived or deleted. */
export function activeWorkspaceId(): WorkspaceId | null {
    if (loadedWorkspaceId !== null && isUsable(loadedWorkspaceId)) {
        return loadedWorkspaceId;
    }
    return currentCatalog?.activeWorkspaceId ?? null;
}

/** True when the workspace exists and is not archived. */
function isUsable(workspaceId: WorkspaceId): boolean {
    const WORKSPACE = workspaceById(workspaceId);
    return WORKSPACE !== null && !WORKSPACE.archived;
}

/** Finds a workspace summary by id in the cached catalog. */
export function workspaceById(
    workspaceId: WorkspaceId,
): WorkspaceSummary | null {
    const WORKSPACES = currentCatalog?.workspaces ?? [];
    return WORKSPACES.find((workspace) => workspace.id === workspaceId) ?? null;
}

/** Workspaces that can be opened, in catalog order. */
export function usableWorkspaces(): WorkspaceSummary[] {
    const WORKSPACES = currentCatalog?.workspaces ?? [];
    return WORKSPACES.filter((workspace) => !workspace.archived);
}

/** Usable workspaces other than the one on screen, e.g. move destinations. */
export function otherUsableWorkspaces(): WorkspaceSummary[] {
    const ACTIVE_ID = activeWorkspaceId();
    return usableWorkspaces().filter((workspace) => workspace.id !== ACTIVE_ID);
}

/** Subscribes to catalog changes and returns an unsubscribe function. */
export function onWorkspaceCatalogChanged(
    listener: WorkspaceCatalogListener,
): () => void {
    LISTENERS.add(listener);
    return (): void => {
        LISTENERS.delete(listener);
    };
}
