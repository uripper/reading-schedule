/**
 * Switches the renderer between workspaces without reloading the application.
 *
 * Order matters for isolation: unsaved edits of the current workspace are saved
 * while its data is still on screen; then autosave is paused and every queued or
 * in-flight plan run is invalidated, so a late planner result can never be applied
 * to the destination; then the destination snapshot is applied through the same
 * loader used at startup. Runs are invalidated again after applying, because a run
 * scheduled during the native round trip would still hold the source's data.
 *
 * While a snapshot is being applied the screen holds no complete workspace, so saves
 * are held back; if applying fails, the previous workspace is restored rather than
 * leaving one workspace's data on screen under another workspace's name.
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
    appliedWorkspaceId,
    beginApplyingWorkspace,
    finishApplyingWorkspace,
    loadedWorkspaceNeedsReplan,
    setLoadedWorkspace,
    workspaceById,
} from "./workspace-store.ts";

const OPEN_DIALOG_SELECTOR = "dialog[open]";
const RELOADING_MESSAGE = "Reloading saved data…";
const BLOCK_INPUT_AT_ONCE_MS = 0;

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
    beginApplyingWorkspace();
    setLoadedWorkspace(loaded);
    await deps.applyState(loaded.state);
    finishApplyingWorkspace(loaded.workspaceId);
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

/** Display name of a workspace for messages. */
function viewName(workspaceId: WorkspaceId): string {
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

/** Reads a workspace and puts it on screen. */
async function openWorkspace(
    deps: WorkspaceSwitchDeps,
    workspaceId: WorkspaceId,
): Promise<void> {
    await applyWorkspaceLoad(deps, await deps.api.load(workspaceId));
}

/** Puts the previous workspace back after a failed switch; true when that worked. */
async function restorePrevious(
    deps: WorkspaceSwitchDeps,
    previousId: WorkspaceId | null,
): Promise<boolean> {
    if (previousId === null) {
        return false;
    }
    try {
        await openWorkspace(deps, previousId);
        return true;
    } catch {
        return false;
    }
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
        await openWorkspace(deps, workspaceId);
    });
    rememberSelection(deps, workspaceId);
    deps.context.announce(`Opened ${NAME}.`);
    return true;
}

/** Reports a failed switch after putting the previous workspace back when possible. */
async function recoverFailedSwitch(
    deps: WorkspaceSwitchDeps,
    previousId: WorkspaceId | null,
    error: unknown,
): Promise<void> {
    // When the failure came before anything was replaced, the screen is still intact.
    const UNTOUCHED =
        previousId !== null && appliedWorkspaceId() === previousId;
    const RESTORED = UNTOUCHED || (await restorePrevious(deps, previousId));
    let advice = "Restart Bartleby before making changes.";
    if (RESTORED) {
        advice = `Bartleby stayed in ${viewName(previousId ?? "")}.`;
        deps.context.state.ready = true;
    }
    deps.context.setStatus(
        `Could not open that workspace: ${errorText(error)} ${advice}`,
        true,
    );
}

/**
 * Opens another workspace while keeping the current tab.
 * @param deps - Renderer wiring used for saving, planning, and applying state.
 * @param workspaceId - Destination workspace id.
 * @returns True when the destination is now shown.
 */
export async function switchWorkspace(
    deps: WorkspaceSwitchDeps,
    workspaceId: WorkspaceId,
): Promise<boolean> {
    if (workspaceId === activeWorkspaceId()) {
        return true;
    }
    if (switchInFlight || hasOpenEditor(deps)) {
        return false;
    }
    switchInFlight = true;
    const PREVIOUS_ID = activeWorkspaceId();
    try {
        return await performSwitch(deps, workspaceId);
    } catch (error) {
        await recoverFailedSwitch(deps, PREVIOUS_ID, error);
        return false;
    } finally {
        switchInFlight = false;
    }
}

/**
 * Re-reads the shown workspace after a native change such as a book transfer, or
 * after a save was refused because storage changed underneath it.
 * @param deps - Renderer wiring used to apply state.
 */
export async function reloadActiveWorkspace(
    deps: WorkspaceSwitchDeps,
): Promise<void> {
    const ACTIVE_ID = activeWorkspaceId();
    if (ACTIVE_ID === null) {
        return;
    }
    await openWorkspace(deps, ACTIVE_ID);
}

/** Reloads the shown workspace with input blocked; restores readiness on failure. */
async function performRecoveryReload(
    deps: WorkspaceSwitchDeps,
    workspaceId: WorkspaceId,
): Promise<void> {
    deps.context.state.ready = false;
    deps.planController.invalidatePendingRuns();
    try {
        await withAppLoading(
            RELOADING_MESSAGE,
            async () => {
                await openWorkspace(deps, workspaceId);
            },
            BLOCK_INPUT_AT_ONCE_MS,
        );
    } catch (error) {
        // A failed read replaced nothing, so the screen can be used again.
        if (appliedWorkspaceId() === workspaceId) {
            deps.context.state.ready = true;
        }
        throw error;
    }
}

/**
 * Reloads the shown workspace after the host refused a save as out of date. It
 * takes the same lock as switching, so a switch and a recovery reload can never
 * overlap and apply each other's workspace, and it blocks input before the read
 * starts, so no edit is made to data that is about to be replaced.
 * @param deps - Renderer wiring used to apply state.
 * @returns False when a switch is already loading fresh data and no reload ran.
 */
export async function reloadAfterRefusedSave(
    deps: WorkspaceSwitchDeps,
): Promise<boolean> {
    const ACTIVE_ID = activeWorkspaceId();
    if (switchInFlight || ACTIVE_ID === null) {
        return false;
    }
    switchInFlight = true;
    try {
        await performRecoveryReload(deps, ACTIVE_ID);
        return true;
    } finally {
        switchInFlight = false;
    }
}
