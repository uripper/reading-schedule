/**
 * Pure helpers behind Settings → Workspaces: row order, row copy, the create
 * form's settings source options, and the destination for books of a deleted
 * workspace. Kept DOM-free so the rules are testable on their own.
 */
import type {
    WorkspaceCatalog,
    WorkspaceId,
    WorkspaceSettingsRow,
    WorkspaceSettingsSourceOption,
    WorkspaceSummary,
} from "../../types/types.ts";

/** Option value meaning "start from Bartleby's default plan settings". */
export const DEFAULT_SETTINGS_SOURCE = "";

const SINGLE_BOOK_COUNT = 1;

/**
 * Describes a workspace's size, e.g. "3 books".
 * @param workspace - Workspace to describe.
 * @returns Info text.
 */
export function workspaceInfoText(workspace: WorkspaceSummary): string {
    let books = `${String(workspace.bookCount)} books`;
    if (workspace.bookCount === SINGLE_BOOK_COUNT) {
        books = "1 book";
    }
    return books;
}

/** Spells out the row status so it never relies on color alone. */
function rowStatusText(workspace: WorkspaceSummary, isActive: boolean): string {
    if (isActive) {
        return "Active";
    }
    if (workspace.archived) {
        return "Archived";
    }
    return "";
}

/** Builds the view model of one workspace row. */
function settingsRow(
    workspace: WorkspaceSummary,
    activeId: WorkspaceId,
): WorkspaceSettingsRow {
    const IS_ACTIVE = workspace.id === activeId;
    return {
        canOpen: !IS_ACTIVE && !workspace.archived,
        infoText: workspaceInfoText(workspace),
        isActive: IS_ACTIVE,
        statusText: rowStatusText(workspace, IS_ACTIVE),
        workspace,
    };
}

/**
 * Lists every workspace with the active one first, others in catalog order.
 * @param catalog - Latest catalog from the host.
 * @returns Row view models for the settings list.
 */
export function workspaceSettingsRows(
    catalog: WorkspaceCatalog,
): WorkspaceSettingsRow[] {
    const ROWS = catalog.workspaces.map((workspace) =>
        settingsRow(workspace, catalog.activeWorkspaceId),
    );
    const ACTIVE_ROWS = ROWS.filter((row) => row.isActive);
    const OTHER_ROWS = ROWS.filter((row) => !row.isActive);
    return [...ACTIVE_ROWS, ...OTHER_ROWS];
}

/**
 * Builds the settings source options: Bartleby defaults, then usable workspaces.
 * @param catalog - Latest catalog, or null before the first save.
 * @returns Options for the create form's settings source select.
 */
export function settingsSourceOptions(
    catalog: WorkspaceCatalog | null,
): WorkspaceSettingsSourceOption[] {
    const WORKSPACES = catalog?.workspaces ?? [];
    const USABLE = WORKSPACES.filter((workspace) => !workspace.archived);
    return [
        { label: "Bartleby defaults", value: DEFAULT_SETTINGS_SOURCE },
        ...USABLE.map((workspace) => ({
            label: workspace.name,
            value: workspace.id,
        })),
    ];
}

/**
 * Chooses where a deleted workspace's books can move.
 *
 * Deleting another workspace offers the active one; deleting the active one
 * offers the first other usable workspace. Empty workspaces need no destination.
 * @param catalog - Latest catalog from the host.
 * @param workspaceId - Workspace being deleted.
 * @returns The destination workspace, or null when none applies.
 */
export function deleteDestination(
    catalog: WorkspaceCatalog,
    workspaceId: WorkspaceId,
): WorkspaceSummary | null {
    const TARGET = catalog.workspaces.find((entry) => entry.id === workspaceId);
    if (TARGET === undefined || TARGET.bookCount === 0) {
        return null;
    }
    const OTHERS = catalog.workspaces.filter(
        (entry) => entry.id !== workspaceId && !entry.archived,
    );
    const ACTIVE = OTHERS.find(
        (entry) => entry.id === catalog.activeWorkspaceId,
    );
    return ACTIVE ?? OTHERS[0] ?? null;
}

/**
 * Normalizes a typed workspace name.
 * @param raw - Input value.
 * @returns The trimmed name, or null when nothing usable was typed.
 */
export function normalizedWorkspaceName(raw: string): string | null {
    const NAME = raw.trim();
    if (NAME.length === 0) {
        return null;
    }
    return NAME;
}

/**
 * Turns a host error (Tauri invoke rejects with strings) into readable text.
 * @param error - Rejection value.
 * @returns Message for the status bar.
 */
export function workspaceErrorText(error: unknown): string {
    if (typeof error === "string" && error.length > 0) {
        return error;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown workspace error.";
}
