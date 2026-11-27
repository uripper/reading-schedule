import { ALL_WORKSPACES_ID } from "@reading-schedule/contracts";
/**
 * Renderer copy of the workspace catalog and of what the renderer currently shows:
 * one workspace, or every workspace merged (the All Workspaces view).
 *
 * The native runtime is the source of truth; this module caches the latest catalog
 * and view it returned, and notifies views (selector, settings, dialog) on change.
 * In the All Workspaces view it also knows which workspace owns each book, and keeps
 * the destinations chosen for books added there until they are saved.
 */
import type {
    PlannerSettings,
    WorkspaceCatalog,
    WorkspaceCatalogListener,
    WorkspaceCombinedMeta,
    WorkspaceId,
    WorkspaceLoadMeta,
    WorkspaceSummary,
} from "../../types/types.ts";

const MIN_WORKSPACES_FOR_ALL_VIEW = 2;

/** Latest catalog returned by the host; null until the first load or save. */
let currentCatalog: WorkspaceCatalog | null = null;
/** Whether the shown workspace(s) had books moved in or out since planning. */
let currentNeedsReplan = false;
/**
 * Single workspace the renderer last loaded. Opening a workspace reads it before the
 * host records the choice, so a catalog's `activeWorkspaceId` can still name the
 * previous workspace; what the renderer shows always comes from the load itself.
 */
let loadedWorkspaceId: WorkspaceId | null = null;
/** Ownership data while the All Workspaces view is shown, else null. */
let combinedView: WorkspaceCombinedMeta | null = null;
/** Destinations of books added in the All Workspaces view, until saved. */
const NEW_BOOK_WORKSPACES = new Map<string, WorkspaceId>();
/** Views to refresh when the catalog or the shown view changes. */
const LISTENERS = new Set<WorkspaceCatalogListener>();

/** Stores a catalog returned by the host and notifies subscribers. */
export function setWorkspaceCatalog(catalog: WorkspaceCatalog): void {
    currentCatalog = catalog;
    for (const LISTENER of LISTENERS) {
        LISTENER(catalog);
    }
}

/** Records the workspace (or All Workspaces) whose snapshot was just applied. */
export function setLoadedWorkspace(meta: WorkspaceLoadMeta | undefined): void {
    if (meta === undefined) {
        return;
    }
    currentNeedsReplan = meta.needsReplan;
    combinedView = meta.combined ?? null;
    if (combinedView === null) {
        loadedWorkspaceId = meta.workspaceId;
    }
    NEW_BOOK_WORKSPACES.clear();
    setWorkspaceCatalog(meta.catalog);
}

/** True when books moved in or out since the shown workspace(s) last planned. */
export function loadedWorkspaceNeedsReplan(): boolean {
    return currentNeedsReplan;
}

/** Returns the cached catalog, or null before the first load. */
export function workspaceCatalog(): WorkspaceCatalog | null {
    return currentCatalog;
}

/** Returns the last opened single workspace (also while All Workspaces is shown). */
export function activeWorkspaceId(): WorkspaceId | null {
    if (loadedWorkspaceId !== null && isUsable(loadedWorkspaceId)) {
        return loadedWorkspaceId;
    }
    // Archived or deleted since it was loaded: follow the host's replacement.
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

/** True when there is more than one usable workspace to show together. */
export function canViewAllWorkspaces(): boolean {
    return usableWorkspaces().length >= MIN_WORKSPACES_FOR_ALL_VIEW;
}

/** True while the renderer shows every workspace merged. */
export function isViewingAllWorkspaces(): boolean {
    return combinedView !== null;
}

/** Id of what the renderer shows: a workspace id or `ALL_WORKSPACES_ID`. */
export function shownWorkspaceId(): WorkspaceId | null {
    if (isViewingAllWorkspaces()) {
        return ALL_WORKSPACES_ID;
    }
    return activeWorkspaceId();
}

/** Owning workspace of a book in the shown data, or null for an unsaved new book. */
export function bookWorkspaceId(bookId: string): WorkspaceId | null {
    if (combinedView === null) {
        return activeWorkspaceId();
    }
    return (
        combinedView.bookWorkspaces[bookId] ??
        NEW_BOOK_WORKSPACES.get(bookId) ??
        null
    );
}

/** Records where a book added in the All Workspaces view will be saved. */
export function assignNewBookWorkspace(
    bookId: string,
    workspaceId: WorkspaceId,
): void {
    NEW_BOOK_WORKSPACES.set(bookId, workspaceId);
}

/** Destinations of books added in the All Workspaces view, for the next save. */
export function newBookWorkspaces(): Record<string, string> | undefined {
    if (combinedView === null || NEW_BOOK_WORKSPACES.size === 0) {
        return undefined;
    }
    return Object.fromEntries(NEW_BOOK_WORKSPACES);
}

/** A workspace's own planner settings while every workspace is shown. */
export function combinedWorkspaceSettings(
    workspaceId: WorkspaceId,
): PlannerSettings | null {
    const SETTINGS = combinedView?.settings[workspaceId];
    if (SETTINGS === undefined || SETTINGS === null) {
        return null;
    }
    // The host stores settings it validated when they were saved.
    return SETTINGS as PlannerSettings;
}

/** Usable workspaces a book could move to from its current workspace. */
export function moveDestinations(
    sourceWorkspaceId: WorkspaceId | null,
): WorkspaceSummary[] {
    return usableWorkspaces().filter(
        (workspace) => workspace.id !== sourceWorkspaceId,
    );
}

/** Subscribes to catalog and view changes and returns an unsubscribe function. */
export function onWorkspaceCatalogChanged(
    listener: WorkspaceCatalogListener,
): () => void {
    LISTENERS.add(listener);
    return (): void => {
        LISTENERS.delete(listener);
    };
}
