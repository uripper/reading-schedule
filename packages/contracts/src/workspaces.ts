/** Runtime validation for workspace payloads returned by the native host. */

import { z } from "zod";
import type {
    WorkspaceCatalog,
    WorkspaceCreated,
    WorkspaceLoad,
    WorkspaceLoadMeta,
    WorkspaceSaveOutcome,
    WorkspaceSnapshotEntry,
    WorkspaceTransferResult,
} from "./types_subfolders/types_workspaces.ts";

const WORKSPACE_ID_SCHEMA = z.string().min(1);

const WORKSPACE_SUMMARY_SCHEMA = z.object({
    archived: z.boolean(),
    bookCount: z.number().int().nonnegative(),
    createdAt: z.string(),
    id: WORKSPACE_ID_SCHEMA,
    name: z.string().min(1),
    revision: z.number().int().nonnegative(),
});

const WORKSPACE_CATALOG_SCHEMA = z.object({
    activeWorkspaceId: WORKSPACE_ID_SCHEMA,
    workspaces: z.array(WORKSPACE_SUMMARY_SCHEMA).min(1),
});

const WORKSPACE_LOAD_META_SCHEMA = z.object({
    catalog: WORKSPACE_CATALOG_SCHEMA,
    needsReplan: z.boolean(),
    revision: z.number().int().nonnegative(),
    workspaceId: WORKSPACE_ID_SCHEMA,
});

const LOADED_STATE_SCHEMA = z.record(z.string(), z.unknown());

const WORKSPACE_LOAD_SCHEMA = WORKSPACE_LOAD_META_SCHEMA.extend({
    state: LOADED_STATE_SCHEMA,
});

const WORKSPACE_SNAPSHOT_ENTRY_SCHEMA = z.object({
    state: LOADED_STATE_SCHEMA,
    summary: WORKSPACE_SUMMARY_SCHEMA,
});

const DEPENDENCY_CONFLICT_SCHEMA = z.object({
    blockedById: z.string(),
    bookId: z.string(),
    direction: z.enum(["incoming", "outgoing"]),
});

const TRANSFER_REQUEST_SCHEMA = z.object({
    bookIds: z.array(z.string()),
    dependencyPolicy: z.enum(["reject", "remove"]),
    restoreBooks: z.array(z.unknown()).nullable().optional(),
    shelfPolicy: z.enum(["keep", "clear"]),
    sourceWorkspaceId: WORKSPACE_ID_SCHEMA,
    targetWorkspaceId: WORKSPACE_ID_SCHEMA,
    today: z.string(),
});

const TRANSFER_OUTCOME_SCHEMA = z.discriminatedUnion("status", [
    z.object({
        conflicts: z.array(DEPENDENCY_CONFLICT_SCHEMA),
        status: z.literal("dependency_conflict"),
    }),
    z.object({
        movedBookIds: z.array(z.string()),
        removedDependencies: z.array(DEPENDENCY_CONFLICT_SCHEMA),
        removedScheduleRows: z.number().int().nonnegative(),
        status: z.literal("moved"),
        undo: TRANSFER_REQUEST_SCHEMA,
    }),
]);

const TRANSFER_RESULT_SCHEMA = z.object({
    catalog: WORKSPACE_CATALOG_SCHEMA,
    outcome: TRANSFER_OUTCOME_SCHEMA,
});

const WORKSPACE_SAVE_OUTCOME_SCHEMA = z.object({
    ok: z.literal(true),
    revision: z.number().int().nonnegative(),
    warningMessage: z.string().optional(),
    workspaceId: WORKSPACE_ID_SCHEMA,
});

const WORKSPACE_CREATED_SCHEMA = z.object({
    catalog: WORKSPACE_CATALOG_SCHEMA,
    workspaceId: WORKSPACE_ID_SCHEMA,
});

/*
 * The schemas validate structure at the host boundary; nested planner records stay
 * `unknown` here and are normalized by the renderer's existing state loaders, so the
 * assertions below only narrow those nested fields to their declared contract types.
 */

/** Validates a workspace catalog returned by the host. */
export function parseWorkspaceCatalog(input: unknown): WorkspaceCatalog {
    return WORKSPACE_CATALOG_SCHEMA.parse(input);
}

/** Validates the workspace metadata attached to a startup load. */
export function parseWorkspaceLoadMeta(input: unknown): WorkspaceLoadMeta {
    return WORKSPACE_LOAD_META_SCHEMA.parse(input);
}

/** Validates a workspace load; its planner state is normalized downstream. */
export function parseWorkspaceLoad(input: unknown): WorkspaceLoad {
    // Nested planner state is normalized downstream by the renderer state loaders.
    return WORKSPACE_LOAD_SCHEMA.parse(input) as WorkspaceLoad;
}

/** Validates snapshot entries used by aggregate views. */
export function parseWorkspaceSnapshots(
    input: unknown,
): WorkspaceSnapshotEntry[] {
    // Nested planner state is normalized downstream by the renderer state loaders.
    return z
        .array(WORKSPACE_SNAPSHOT_ENTRY_SCHEMA)
        .parse(input) as WorkspaceSnapshotEntry[];
}

/** Validates the result of saving the active workspace. */
export function parseWorkspaceSaveOutcome(
    input: unknown,
): WorkspaceSaveOutcome {
    return WORKSPACE_SAVE_OUTCOME_SCHEMA.parse(input);
}

/** Validates the result of creating a workspace. */
export function parseWorkspaceCreated(input: unknown): WorkspaceCreated {
    return WORKSPACE_CREATED_SCHEMA.parse(input);
}

/** Validates a book transfer result, including its undo request. */
export function parseWorkspaceTransferResult(
    input: unknown,
): WorkspaceTransferResult {
    // Undo book records are opaque round-trip data validated again by the host.
    return TRANSFER_RESULT_SCHEMA.parse(input) as WorkspaceTransferResult;
}
