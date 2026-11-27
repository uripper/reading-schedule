/**
 * Wires workspace features into the renderer once the first workspace is loaded.
 * Hosts without a workspace API (the website demo) keep a single library unchanged.
 */
import type {
    AppBootstrapContext,
    CalendarHandlers,
    PlanController,
    WorkspaceRuntime,
    WorkspaceSwitchDeps,
} from "../../types/types.ts";
import { applyWorkspacePlannerState } from "../app/init/init-app-load.ts";
import { resetTodayCarouselUiState } from "../app/today/today_carousel_state.ts";
import { bindBookDialogWorkspaceField } from "./book-dialog-workspace-field.ts";
import { bindLibraryMoveControl } from "./library-move-control.ts";
import { bindSaveRecovery } from "./workspace-save-recovery.ts";
import { bindWorkspaceSelector } from "./workspace-selector.ts";
import { bindWorkspaceSettings } from "./workspace-settings.ts";
import { setWorkspaceCatalog, workspaceCatalog } from "./workspace-store.ts";
import { reloadActiveWorkspace, switchWorkspace } from "./workspace-switch.ts";
import { moveBooksToWorkspace } from "./workspace-transfer.ts";

/**
 * Creates the workspace runtime and binds the selector, Settings section, and
 * book-dialog field.
 * @param context - Application bootstrap context.
 * @param planController - Planner controller for isolation and replans.
 * @param calendarHandlers - Schedule handlers of the active workspace.
 * @returns The runtime, or null when the host has no workspaces.
 */
export function initWorkspaces(
    context: AppBootstrapContext,
    planController: PlanController,
    calendarHandlers: CalendarHandlers,
): WorkspaceRuntime | null {
    const API = context.plannerApi.workspaces;
    if (API === undefined) {
        return null;
    }
    const RUNTIME = createWorkspaceRuntime(calendarHandlers, {
        api: API,
        applyState: async (state) => {
            await applyWorkspacePlannerState(context, planController, state);
        },
        context,
        planController,
        resetTransientUi: resetTodayCarouselUiState,
    });
    bindWorkspaceSelector(RUNTIME.switchTo);
    bindWorkspaceSettings(RUNTIME);
    bindBookDialogWorkspaceField(RUNTIME.moveBooks);
    bindLibraryMoveControl(RUNTIME.moveBooks);
    bindSaveRecovery(RUNTIME);
    if (workspaceCatalog() === null) {
        RUNTIME.refreshCatalog().catch((): void => {
            context.addLog("Workspaces become available after the first save.");
        });
    }
    return RUNTIME;
}

/**
 * Builds the runtime over already-wired switch dependencies.
 * @param calendarHandlers - Schedule handlers of the active workspace.
 * @param deps - Renderer wiring for saving, planning, and applying state.
 * @returns Workspace operations for feature views.
 */
function createWorkspaceRuntime(
    calendarHandlers: CalendarHandlers,
    deps: WorkspaceSwitchDeps,
): WorkspaceRuntime {
    return {
        calendarHandlers,
        deps,
        moveBooks: async (bookIds, workspaceId) => {
            await moveBooksToWorkspace(deps, bookIds, workspaceId);
        },
        refreshCatalog: async () => {
            setWorkspaceCatalog(await deps.api.list());
        },
        reloadActive: async () => {
            await reloadActiveWorkspace(deps);
        },
        switchTo: async (workspaceId) =>
            await switchWorkspace(deps, workspaceId),
    };
}
