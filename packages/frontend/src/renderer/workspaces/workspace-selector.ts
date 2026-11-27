import { ALL_WORKSPACES_ID } from "@reading-schedule/contracts";
/**
 * Header workspace selector, reachable from every primary tab.
 *
 * Switching keeps the current tab. The control is hidden on hosts without
 * workspaces and while only one workspace is usable, so single-library users see
 * no change; its visible label names what is shown for screen readers too.
 */
import type { WorkspaceRuntime, WorkspaceSummary } from "../../types/types.ts";
import { el } from "../dom.ts";
import {
    canViewAllWorkspaces,
    onWorkspaceCatalogChanged,
    shownWorkspaceId,
    usableWorkspaces,
} from "./workspace-store.ts";

const WRAP_ID = "workspaceSelectWrap";
const SELECT_ID = "workspaceSelect";
const ALL_WORKSPACES_LABEL = "All Workspaces";

/** Builds the leading All Workspaces option. */
function allWorkspacesOption(): HTMLOptionElement {
    const OPTION = document.createElement("option");
    OPTION.value = ALL_WORKSPACES_ID;
    OPTION.textContent = ALL_WORKSPACES_LABEL;
    return OPTION;
}

/** Lists All Workspaces plus every usable workspace; hidden when there is no choice. */
function render(select: HTMLSelectElement): void {
    fillWorkspaceOptions(select, usableWorkspaces(), null);
    select.prepend(allWorkspacesOption());
    const SELECT = select;
    SELECT.value = shownWorkspaceId() ?? "";
    el(WRAP_ID).hidden = !canViewAllWorkspaces();
}

/**
 * Binds the header selector. All Workspaces shows every workspace on every tab;
 * a single workspace shows only its own data. Either way the current tab is kept.
 * @param switchTo - Opens a workspace or All Workspaces; false when it stayed put.
 */
export function bindWorkspaceSelector(
    switchTo: WorkspaceRuntime["switchTo"],
): void {
    const SELECT = el<HTMLSelectElement>(SELECT_ID);
    render(SELECT);
    onWorkspaceCatalogChanged((): void => {
        render(SELECT);
    });
    SELECT.addEventListener("change", (): void => {
        SELECT.disabled = true;
        switchTo(SELECT.value)
            .catch(() => false)
            .finally((): void => {
                SELECT.disabled = false;
                render(SELECT);
            });
    });
}

/**
 * Replaces the options of a select with workspace names.
 * @param select - Select element to fill.
 * @param workspaces - Workspaces to list, in order.
 * @param selectedId - Workspace id to select.
 */
export function fillWorkspaceOptions(
    select: HTMLSelectElement,
    workspaces: readonly WorkspaceSummary[],
    selectedId: string | null,
): void {
    const OPTIONS = workspaces.map((workspace) => {
        const OPTION = document.createElement("option");
        OPTION.value = workspace.id;
        OPTION.textContent = workspace.name;
        return OPTION;
    });
    select.replaceChildren(...OPTIONS);
    if (selectedId !== null) {
        const SELECT = select;
        SELECT.value = selectedId;
    }
}
