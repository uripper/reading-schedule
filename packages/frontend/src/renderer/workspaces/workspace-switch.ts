import { ALL_WORKSPACES_ID } from "@reading-schedule/contracts";
/**
 * Switches the renderer between workspaces without reloading the application.
 *
 * Order matters for isolation: unsaved edits of the current workspace are saved
 * while its data is still on screen; then autosave is paused and every queued or
 * in-flight plan run is invalidated, so a late planner result can never be applied
 * to the destination; then the destination snapshot is applied through the same
 * loader used at startup. Runs are invalidated again after applying, because a run
 * scheduled during the native round trip would still hold the source's data.
 */
import type {
    WorkspaceId,
    WorkspaceLoad,
    WorkspaceSwitchDeps,
} from "../../types/types.ts";
import { withAppLoading } from "../app/app-loading.ts";
import { localDayKeyFromIso, todayDayKey } from "../app/date_keys.ts";
import {
    activeWorkspaceId,
    canViewAllWorkspaces,
    isViewingAllWorkspaces,
    loadedWorkspaceNeedsReplan,
    setLoadedWorkspace,
    shownWorkspaceId,
    workspaceById,
} from "./workspace-store.ts";

const OPEN_DIALOG_SELECTOR = "dialog[open]";
const ALL_WORKSPACES_NAME = "All Workspaces";

/** Prevents overlapping switches from interleaving their saves and loads. */
let switchInFlight = false;

/** Turns a host rejection (usually a string) into readable text. */
function errorText(error: unknown): string {
    if (typeof error === "string") {
        return error;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown workspace error.";
}

/** A planned schedule is reused unless books moved or it was made on another day. */
function shouldReplan(loaded: WorkspaceLoad): boolean {
    if (loadedWorkspaceNeedsReplan()) {
        return true;
    }
    const CREATED_AT = loaded.state.last_result?.created_at;
    if (typeof CREATED_AT !== "string" || CREATED_AT.length === 0) {
        return true;
    }
    return localDayKeyFromIso(CREATED_AT) !== todayDayKey();
}

/**
 * Applies a loaded workspace snapshot to the running renderer.
 * @param deps - Renderer wiring used to apply state and replan.
 * @param loaded - Workspace payload returned by the host.
 */
export async function applyWorkspaceLoad(
    deps: WorkspaceSwitchDeps,
    loaded: WorkspaceLoad,
): Promise<void> {
    const STATE = deps.context.state;
    STATE.ready = false;
    deps.planController.invalidatePendingRuns();
    deps.resetTransientUi();
    setLoadedWorkspace(loaded);
    await deps.applyState(loaded.state);
    deps.planController.invalidatePendingRuns();
    STATE.ready = true;
    if (shouldReplan(loaded)) {
        deps.planController.queueAutoPlan();
    }
}

/** Saves the current workspace; switching is refused if that save fails. */
async function flushBeforeLeaving(deps: WorkspaceSwitchDeps): Promise<boolean> {
    const SAVED = await deps.context.flushPendingChanges();
    if (SAVED) {
        return true;
    }
    deps.context.setStatus(
        "Bartleby could not save this workspace, so it stayed open. Retry the save, then switch.",
        true,
    );
    return false;
}

/** Refuses to switch while a dialog may hold unsaved edits. */
function hasOpenEditor(deps: WorkspaceSwitchDeps): boolean {
    if (document.querySelector(OPEN_DIALOG_SELECTOR) === null) {
        return false;
    }
    deps.context.setStatus(
        "Save or close the open dialog before switching workspaces.",
        true,
    );
    return true;
}

/** Reads a workspace, or every workspace merged, without changing the saved choice. */
async function readView(
    deps: WorkspaceSwitchDeps,
    workspaceId: WorkspaceId,
): Promise<WorkspaceLoad> {
    if (workspaceId === ALL_WORKSPACES_ID) {
        return await deps.api.loadAll();
    }
    return await deps.api.load(workspaceId);
}

/** Display name of a workspace or of the All Workspaces view. */
function viewName(workspaceId: WorkspaceId): string {
    if (workspaceId === ALL_WORKSPACES_ID) {
        return ALL_WORKSPACES_NAME;
    }
    return workspaceById(workspaceId)?.name ?? "workspace";
}

/** Saves the choice for next launch off the switching path; failures are reported. */
function rememberSelection(
    deps: WorkspaceSwitchDeps,
    workspaceId: WorkspaceId,
): void {
    deps.api.select(workspaceId).catch((error: unknown): void => {
        deps.context.setStatus(
            `Bartleby could not remember this workspace for next launch: ${errorText(error)}`,
            true,
        );
    });
}

/** Saves pending edits, isolates planning, then reads and applies the destination. */
async function performSwitch(
    deps: WorkspaceSwitchDeps,
    workspaceId: WorkspaceId,
): Promise<boolean> {
    if (!(await flushBeforeLeaving(deps))) {
        return false;
    }
    const NAME = viewName(workspaceId);
    await withAppLoading(`Opening ${NAME}…`, async () => {
        deps.context.state.ready = false;
        deps.planController.invalidatePendingRuns();
        await applyWorkspaceLoad(deps, await readView(deps, workspaceId));
    });
    rememberSelection(deps, workspaceId);
    deps.context.announce(`Opened ${NAME}.`);
    return true;
}

/**
 * Opens another workspace, or All Workspaces, while keeping the current tab.
 * @param deps - Renderer wiring used for saving, planning, and applying state.
 * @param workspaceId - Destination workspace id or `ALL_WORKSPACES_ID`.
 * @returns True when the destination is now shown.
 */
export async function switchWorkspace(
    deps: WorkspaceSwitchDeps,
    workspaceId: WorkspaceId,
): Promise<boolean> {
    if (workspaceId === shownWorkspaceId()) {
        return true;
    }
    if (switchInFlight || hasOpenEditor(deps)) {
        return false;
    }
    switchInFlight = true;
    try {
        return await performSwitch(deps, workspaceId);
    } catch (error) {
        deps.context.state.ready = true;
        deps.context.setStatus(
            `Could not open that workspace: ${errorText(error)}`,
            true,
        );
        return false;
    } finally {
        switchInFlight = false;
    }
}

/**
 * Re-reads what is shown after a native change such as a book transfer. When All
 * Workspaces no longer has two workspaces to show, it falls back to the active one.
 * @param deps - Renderer wiring used to apply state.
 */
export async function reloadActiveWorkspace(
    deps: WorkspaceSwitchDeps,
): Promise<void> {
    if (isViewingAllWorkspaces() && canViewAllWorkspaces()) {
        await applyWorkspaceLoad(deps, await deps.api.loadAll());
        return;
    }
    const ACTIVE_ID = activeWorkspaceId();
    if (ACTIVE_ID === null) {
        return;
    }
    const WAS_ALL = isViewingAllWorkspaces();
    await applyWorkspaceLoad(deps, await deps.api.load(ACTIVE_ID));
    if (WAS_ALL) {
        rememberSelection(deps, ACTIVE_ID);
    }
}
