/**
 * Header workspace selector, reachable from every primary tab.
 *
 * Switching keeps the current tab. The control is hidden on hosts without
 * workspaces and while only one workspace is usable, so single-library users see
 * no change. Its value always names the workspace whose data is on screen.
 */
import type { WorkspaceRuntime, WorkspaceSummary } from "../../types/types.ts";
import { el } from "../dom.ts";
import {
    activeWorkspaceId,
    onWorkspaceCatalogChanged,
    usableWorkspaces,
} from "./workspace-store.ts";

const WRAP_ID = "workspaceSelectWrap";
const SELECT_ID = "workspaceSelect";
const MIN_WORKSPACES_FOR_SELECTOR = 2;

/** Lists usable workspaces; hidden when there is no choice. */
function render(select: HTMLSelectElement): void {
    const WORKSPACES = usableWorkspaces();
    fillWorkspaceOptions(select, WORKSPACES, activeWorkspaceId());
    el(WRAP_ID).hidden = WORKSPACES.length < MIN_WORKSPACES_FOR_SELECTOR;
}

/**
 * Binds the header selector; the current tab is kept when switching.
 * @param switchTo - Opens a workspace; false when it stayed put.
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
