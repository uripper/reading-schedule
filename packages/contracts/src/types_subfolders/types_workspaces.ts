/**
 * Workspace contracts: independent reading and planning environments.
 *
 * The native runtime owns workspace persistence; the renderer holds only the active
 * workspace's planner snapshot and exchanges these shapes with the host.
 */

import type { Book } from "./types_books.ts";
import type { LoadedPlannerState } from "./types_planner.ts";

/** Stable, immutable workspace identifier assigned by the native runtime. */
export type WorkspaceId = string;

export interface WorkspaceSummary {
    archived: boolean;
    bookCount: number;
    createdAt: string;
    id: WorkspaceId;
    name: string;
    /** Increases on every write of this workspace's planner snapshot. */
    revision: number;
}

export interface WorkspaceCatalog {
    activeWorkspaceId: WorkspaceId;
    workspaces: WorkspaceSummary[];
}

/** Ownership and per-workspace data of the All Workspaces view. */
export interface WorkspaceCombinedMeta {
    /** Owning workspace of every book in the merged snapshot. */
    bookWorkspaces: Record<string, WorkspaceId>;
    revisions: Record<WorkspaceId, number>;
    /** Each workspace's own planner settings; planning stays per workspace. */
    settings: Record<WorkspaceId, unknown>;
}

/** Identifies the workspace a planner snapshot was loaded from. */
export interface WorkspaceLoadMeta {
    catalog: WorkspaceCatalog;
    /** Present when the snapshot merges every workspace (All Workspaces view). */
    combined?: WorkspaceCombinedMeta;
    /** True when books moved in or out since this workspace last planned. */
    needsReplan: boolean;
    revision: number;
    workspaceId: WorkspaceId;
}

export interface WorkspaceLoad extends WorkspaceLoadMeta {
    state: LoadedPlannerState;
}

/** One non-archived workspace, used by aggregate (All Workspaces) views. */
export interface WorkspaceSnapshotEntry {
    state: LoadedPlannerState;
    summary: WorkspaceSummary;
}

/** Native result of saving the active workspace's planner snapshot. */
export interface WorkspaceSaveOutcome {
    ok: true;
    revision: number;
    /** Every workspace's revision after an All Workspaces save. */
    revisions?: Record<WorkspaceId, number>;
    warningMessage?: string;
    workspaceId: WorkspaceId;
}

export interface WorkspaceCreateRequest {
    /** Copies planner settings and the daily goal, never books or history. */
    inheritSettingsFrom: WorkspaceId | null;
    name: string;
}

export interface WorkspaceCreated {
    catalog: WorkspaceCatalog;
    workspaceId: WorkspaceId;
}

export interface WorkspaceDeleteRequest {
    /** Local `YYYY-MM-DD` day; schedule rows from this day on follow moved books. */
    today: string;
    transferBooksTo: WorkspaceId | null;
    workspaceId: WorkspaceId;
}

/** `reject` reports cross-workspace After Book links; `remove` clears them. */
export type WorkspaceDependencyPolicy = "reject" | "remove";

/** `keep` preserves shelf and collections; `clear` empties both. */
export type WorkspaceShelfPolicy = "keep" | "clear";

export interface WorkspaceTransferRequest {
    bookIds: string[];
    dependencyPolicy: WorkspaceDependencyPolicy;
    /** Pre-transfer records restored by an undo request. */
    restoreBooks?: Book[] | null;
    shelfPolicy: WorkspaceShelfPolicy;
    sourceWorkspaceId: WorkspaceId;
    targetWorkspaceId: WorkspaceId;
    /** Local `YYYY-MM-DD` day; uncompleted rows from this day on are replanned. */
    today: string;
}

export type WorkspaceDependencyDirection = "incoming" | "outgoing";

/** A `blocked_by` link that a transfer would split across workspaces. */
export interface WorkspaceDependencyConflict {
    blockedById: string;
    bookId: string;
    direction: WorkspaceDependencyDirection;
}

export interface WorkspaceTransferMoved {
    movedBookIds: string[];
    removedDependencies: WorkspaceDependencyConflict[];
    removedScheduleRows: number;
    status: "moved";
    undo: WorkspaceTransferRequest;
}

export interface WorkspaceTransferConflict {
    conflicts: WorkspaceDependencyConflict[];
    status: "dependency_conflict";
}

export type WorkspaceTransferOutcome =
    | WorkspaceTransferConflict
    | WorkspaceTransferMoved;

export interface WorkspaceTransferResult {
    catalog: WorkspaceCatalog;
    outcome: WorkspaceTransferOutcome;
}

export interface WorkspaceCompletionRequest {
    completed: boolean;
    sessionKey: string;
    workspaceId: WorkspaceId;
}

/** Host operations for workspaces; absent on hosts with a single library. */
export interface WorkspaceApi {
    /** Reads a workspace for the renderer to show; later saves target it. */
    load(this: void, workspaceId: WorkspaceId): Promise<WorkspaceLoad>;
    /** Reads every workspace merged (All Workspaces); later saves split by owner. */
    loadAll(this: void): Promise<WorkspaceLoad>;
    /** Records the workspace, or `ALL_WORKSPACES_ID`, that reopens on next launch. */
    select(this: void, workspaceId: WorkspaceId): Promise<void>;
    create(
        this: void,
        request: WorkspaceCreateRequest,
    ): Promise<WorkspaceCreated>;
    list(this: void): Promise<WorkspaceCatalog>;
    remove(
        this: void,
        request: WorkspaceDeleteRequest,
    ): Promise<WorkspaceCatalog>;
    rename(
        this: void,
        workspaceId: WorkspaceId,
        name: string,
    ): Promise<WorkspaceCatalog>;
    setArchived(
        this: void,
        workspaceId: WorkspaceId,
        archived: boolean,
    ): Promise<WorkspaceCatalog>;
    setSessionCompletion(
        this: void,
        request: WorkspaceCompletionRequest,
    ): Promise<WorkspaceCatalog>;
    snapshots(this: void): Promise<WorkspaceSnapshotEntry[]>;
    transferBooks(
        this: void,
        request: WorkspaceTransferRequest,
    ): Promise<WorkspaceTransferResult>;
}

/* Settings → Workspaces view contracts. */

/** One option of the "Start with plan settings from" select. */
export interface WorkspaceSettingsSourceOption {
    label: string;
    /** Workspace id, or an empty string for Bartleby's default settings. */
    value: string;
}

/** One rendered row of the Settings → Workspaces list. */
export interface WorkspaceSettingsRow {
    /** False for the active workspace and archived ones. */
    canOpen: boolean;
    infoText: string;
    isActive: boolean;
    /** "Active", "Archived", or empty; state is never conveyed by color alone. */
    statusText: string;
    workspace: WorkspaceSummary;
}

/** Callbacks invoked by the controls of one workspace row. */
export interface WorkspaceRowHandlers {
    archive(this: void, workspaceId: WorkspaceId, archived: boolean): void;
    open(this: void, workspaceId: WorkspaceId): void;
    remove(this: void, workspaceId: WorkspaceId): void;
    rename(this: void, workspaceId: WorkspaceId, input: HTMLInputElement): void;
}

/** Outcome of the delete confirmations: cancel, or delete with a destination. */
export type WorkspaceDeleteChoice =
    | { kind: "cancel" }
    | { kind: "delete"; transferBooksTo: WorkspaceId | null };
