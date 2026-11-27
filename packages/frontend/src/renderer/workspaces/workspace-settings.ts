/**
 * Settings → Workspaces: lists every workspace with rename, open, archive or
 * restore, and delete controls, plus a form to create a workspace.
 *
 * The section tab stays hidden on hosts without workspaces; binding it reveals
 * the tab. The list follows the shared catalog and the catalog is re-read from
 * the host whenever the section is opened.
 */
import type { WorkspaceRowHandlers } from "../../types/types.ts";
import type { WorkspaceRuntime } from "../../types/types.ts";
import { el } from "../dom.ts";
import {
    archiveWorkspaceFromSettings,
    createWorkspaceFromSettings,
    deleteWorkspaceFromSettings,
    openWorkspaceFromSettings,
    renameWorkspaceFromSettings,
} from "./workspace-settings-actions.ts";
import {
    DEFAULT_SETTINGS_SOURCE,
    normalizedWorkspaceName,
    workspaceErrorText,
} from "./workspace-settings-model.ts";
import {
    renderSettingsSourceOptions,
    renderWorkspaceRows,
} from "./workspace-settings-render.ts";
import {
    onWorkspaceCatalogChanged,
    workspaceCatalog,
} from "./workspace-store.ts";

const TAB_ID = "workspacesSettingsTab";
const LIST_ID = "workspaceSettingsList";
const EMPTY_ID = "workspaceSettingsEmpty";
const FORM_ID = "workspaceCreateForm";
const NAME_ID = "workspaceCreateName";
const SOURCE_ID = "workspaceCreateSource";
const SUBMIT_ID = "workspaceCreateSubmit";

/** Builds a rejection handler that shows host errors in the status bar. */
function errorReporter(runtime: WorkspaceRuntime): (error: unknown) => void {
    return (error: unknown): void => {
        runtime.deps.context.setStatus(workspaceErrorText(error), true);
    };
}

/** Connects row controls to workspace mutations. */
function rowHandlers(runtime: WorkspaceRuntime): WorkspaceRowHandlers {
    const REPORT = errorReporter(runtime);
    return {
        archive: (workspaceId, archived): void => {
            archiveWorkspaceFromSettings(runtime, workspaceId, archived).catch(
                REPORT,
            );
        },
        open: (workspaceId): void => {
            openWorkspaceFromSettings(runtime, workspaceId).catch(REPORT);
        },
        remove: (workspaceId): void => {
            deleteWorkspaceFromSettings(runtime, workspaceId).catch(REPORT);
        },
        rename: (workspaceId, input): void => {
            renameWorkspaceFromSettings(runtime, workspaceId, input).catch(
                REPORT,
            );
        },
    };
}

/** Re-renders the list and settings sources from the cached catalog. */
function render(handlers: WorkspaceRowHandlers): void {
    const CATALOG = workspaceCatalog();
    renderSettingsSourceOptions(el<HTMLSelectElement>(SOURCE_ID), CATALOG);
    el(EMPTY_ID).hidden = CATALOG !== null;
    if (CATALOG === null) {
        el(LIST_ID).replaceChildren();
        return;
    }
    renderWorkspaceRows(el(LIST_ID), CATALOG, handlers);
}

/** Validates the create form and creates the workspace. */
async function submitCreate(runtime: WorkspaceRuntime): Promise<void> {
    const NAME_INPUT = el<HTMLInputElement>(NAME_ID);
    const SOURCE = el<HTMLSelectElement>(SOURCE_ID);
    const NAME = normalizedWorkspaceName(NAME_INPUT.value);
    if (NAME === null) {
        runtime.deps.context.setStatus(
            "Enter a name for the new workspace.",
            true,
        );
        NAME_INPUT.focus();
        return;
    }
    let inheritSettingsFrom: string | null = SOURCE.value;
    if (inheritSettingsFrom === DEFAULT_SETTINGS_SOURCE) {
        inheritSettingsFrom = null;
    }
    const SUBMIT = el<HTMLButtonElement>(SUBMIT_ID);
    SUBMIT.disabled = true;
    try {
        if (
            await createWorkspaceFromSettings(runtime, {
                inheritSettingsFrom,
                name: NAME,
            })
        ) {
            NAME_INPUT.value = "";
            SOURCE.value = DEFAULT_SETTINGS_SOURCE;
        }
    } finally {
        SUBMIT.disabled = false;
    }
}

/** Handles create form submission. */
function bindCreateForm(runtime: WorkspaceRuntime): void {
    el<HTMLFormElement>(FORM_ID).addEventListener("submit", (event): void => {
        event.preventDefault();
        submitCreate(runtime).catch(errorReporter(runtime));
    });
}

/** Reveals the section tab and refreshes the catalog whenever it is opened. */
function bindSectionTab(runtime: WorkspaceRuntime): void {
    const TAB = el(TAB_ID);
    TAB.hidden = false;
    TAB.addEventListener("click", (): void => {
        runtime.refreshCatalog().catch((error: unknown): void => {
            runtime.deps.context.setStatus(
                `Could not load workspaces: ${workspaceErrorText(error)}`,
                true,
            );
        });
    });
}

/**
 * Binds Settings → Workspaces and reveals its section tab.
 * @param runtime - Workspace runtime of a host with workspaces.
 */
export function bindWorkspaceSettings(runtime: WorkspaceRuntime): void {
    const HANDLERS = rowHandlers(runtime);
    bindSectionTab(runtime);
    bindCreateForm(runtime);
    render(HANDLERS);
    onWorkspaceCatalogChanged((): void => {
        render(HANDLERS);
    });
}
