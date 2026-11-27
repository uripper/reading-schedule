/**
 * Renders the Settings → Workspaces list and the create form's settings source
 * select. Every control names its workspace in its accessible label, status is
 * spelled out in text ("Active", "Archived"), and focus survives re-renders.
 */
import type {
    WorkspaceCatalog,
    WorkspaceRowHandlers,
    WorkspaceSettingsRow,
} from "../../types/types.ts";
import {
    settingsSourceOptions,
    workspaceSettingsRows,
} from "./workspace-settings-model.ts";

/** Maximum workspace name length accepted by the inputs. */
const WORKSPACE_NAME_MAX_LENGTH = 80;

const ACTION_ATTRIBUTE = "workspaceAction";
const ID_ATTRIBUTE = "workspaceId";

/** Creates a row button whose accessible name includes the workspace name. */
function actionButton(
    row: WorkspaceSettingsRow,
    action: string,
    label: string,
): HTMLButtonElement {
    const BUTTON = document.createElement("button");
    BUTTON.type = "button";
    BUTTON.className = "btn btn-compact";
    BUTTON.textContent = label;
    BUTTON.setAttribute("aria-label", `${label} ${row.workspace.name}`);
    BUTTON.dataset[ACTION_ATTRIBUTE] = action;
    BUTTON.dataset[ID_ATTRIBUTE] = row.workspace.id;
    return BUTTON;
}

/** Creates the inline rename input of a row. */
function nameInput(
    row: WorkspaceSettingsRow,
    handlers: WorkspaceRowHandlers,
): HTMLInputElement {
    const INPUT = document.createElement("input");
    INPUT.type = "text";
    INPUT.className = "workspace-settings-name";
    INPUT.value = row.workspace.name;
    INPUT.required = true;
    INPUT.maxLength = WORKSPACE_NAME_MAX_LENGTH;
    INPUT.setAttribute("aria-label", `Name of ${row.workspace.name}`);
    INPUT.dataset[ACTION_ATTRIBUTE] = "rename";
    INPUT.dataset[ID_ATTRIBUTE] = row.workspace.id;
    INPUT.addEventListener("change", (): void => {
        handlers.rename(row.workspace.id, INPUT);
    });
    return INPUT;
}

/** Creates an element holding plain text. */
function textNode(tag: string, className: string, text: string): HTMLElement {
    const NODE = document.createElement(tag);
    NODE.className = className;
    NODE.textContent = text;
    return NODE;
}

/** Creates the Archive or Restore toggle of a row. */
function archiveButton(
    row: WorkspaceSettingsRow,
    handlers: WorkspaceRowHandlers,
): HTMLButtonElement {
    const ARCHIVED = row.workspace.archived;
    let label = "Archive";
    if (ARCHIVED) {
        label = "Restore";
    }
    const BUTTON = actionButton(row, "archive", label);
    BUTTON.addEventListener("click", (): void => {
        handlers.archive(row.workspace.id, !ARCHIVED);
    });
    return BUTTON;
}

/** Creates the Open, Archive or Restore, and Delete buttons of a row. */
function rowActions(
    row: WorkspaceSettingsRow,
    handlers: WorkspaceRowHandlers,
): HTMLElement {
    const ACTIONS = document.createElement("div");
    ACTIONS.className = "workspace-settings-actions";
    const OPEN = actionButton(row, "open", "Open");
    OPEN.hidden = !row.canOpen;
    OPEN.addEventListener("click", (): void => {
        handlers.open(row.workspace.id);
    });
    const DELETE = actionButton(row, "delete", "Delete");
    DELETE.classList.add("btn-remove");
    const ICON = textNode("span", "icon icon-trash", "");
    ICON.setAttribute("aria-hidden", "true");
    DELETE.prepend(ICON);
    DELETE.addEventListener("click", (): void => {
        handlers.remove(row.workspace.id);
    });
    ACTIONS.append(OPEN, archiveButton(row, handlers), DELETE);
    return ACTIONS;
}

/** Creates one list item for a workspace row. */
function rowNode(
    row: WorkspaceSettingsRow,
    handlers: WorkspaceRowHandlers,
): HTMLLIElement {
    const ITEM = document.createElement("li");
    ITEM.className = "workspace-settings-row";
    ITEM.classList.toggle("is-active", row.isActive);
    ITEM.classList.toggle("is-archived", row.workspace.archived);
    const HEADER = document.createElement("div");
    HEADER.className = "workspace-settings-row-header";
    HEADER.append(nameInput(row, handlers));
    if (row.statusText.length > 0) {
        HEADER.append(
            textNode("span", "workspace-settings-status", row.statusText),
        );
    }
    ITEM.append(
        HEADER,
        textNode("p", "workspace-settings-info", row.infoText),
        rowActions(row, handlers),
    );
    return ITEM;
}

/** Identifies the focused row control so focus can return after re-rendering. */
function focusedControlKey(list: HTMLElement): string | null {
    const FOCUSED = document.activeElement;
    if (!(FOCUSED instanceof HTMLElement) || !list.contains(FOCUSED)) {
        return null;
    }
    const ACTION = FOCUSED.dataset[ACTION_ATTRIBUTE] ?? "";
    const ID = FOCUSED.dataset[ID_ATTRIBUTE] ?? "";
    return `${ID}:${ACTION}`;
}

/** Focuses the re-rendered control that matches the previously focused one. */
function restoreFocus(list: HTMLElement, key: string | null): void {
    if (key === null) {
        return;
    }
    const CONTROLS = list.querySelectorAll<HTMLElement>(
        "[data-workspace-action]",
    );
    const MATCH = Array.from(CONTROLS).find((control) => {
        const ACTION = control.dataset[ACTION_ATTRIBUTE] ?? "";
        const ID = control.dataset[ID_ATTRIBUTE] ?? "";
        return `${ID}:${ACTION}` === key && !control.hidden;
    });
    MATCH?.focus();
}

/**
 * Replaces the workspace list with one row per workspace, active first.
 * @param list - List container.
 * @param catalog - Latest catalog from the host.
 * @param handlers - Row control callbacks.
 */
export function renderWorkspaceRows(
    list: HTMLElement,
    catalog: WorkspaceCatalog,
    handlers: WorkspaceRowHandlers,
): void {
    const FOCUS_KEY = focusedControlKey(list);
    const ROWS = workspaceSettingsRows(catalog).map((row) =>
        rowNode(row, handlers),
    );
    list.replaceChildren(...ROWS);
    restoreFocus(list, FOCUS_KEY);
}

/**
 * Refills the settings source select, keeping the chosen source when it remains.
 * @param select - "Start with plan settings from" select.
 * @param catalog - Latest catalog, or null before the first save.
 */
export function renderSettingsSourceOptions(
    select: HTMLSelectElement,
    catalog: WorkspaceCatalog | null,
): void {
    const PREVIOUS = select.value;
    const OPTIONS = settingsSourceOptions(catalog);
    select.replaceChildren(
        ...OPTIONS.map((entry) => {
            const OPTION = document.createElement("option");
            OPTION.value = entry.value;
            OPTION.textContent = entry.label;
            return OPTION;
        }),
    );
    if (OPTIONS.some((entry) => entry.value === PREVIOUS)) {
        const SELECT = select;
        SELECT.value = PREVIOUS;
    }
}
