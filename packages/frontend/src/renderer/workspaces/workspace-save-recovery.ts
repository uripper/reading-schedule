/**
 * Recovers when the host refuses a save because storage no longer matches the screen.
 *
 * Retrying such a save can never succeed (its revision or contents are out of date),
 * so instead of leaving a permanent error, Bartleby reloads the saved workspace and
 * saves once to confirm storage and screen agree again, which clears the error.
 */
import type { WorkspaceRuntime } from "../../types/types.ts";

const OUT_OF_SYNC_PREFIXES = [
    "STALE_WORKSPACE_REVISION",
    "WORKSPACE_OUT_OF_SYNC",
];
const RELOADED_MESSAGE =
    "This workspace changed in storage, so Bartleby reloaded the saved version. Check your most recent change.";

let recover: ((error: string) => void) | null = null;
let isReloading = false;

/** True when retrying the save cannot work and the workspace must be reloaded. */
function isOutOfSync(error: string): boolean {
    return OUT_OF_SYNC_PREFIXES.some((prefix) => error.startsWith(prefix));
}

/** Reloads the workspace, then saves once so the save error clears. */
async function reloadAfterRefusal(runtime: WorkspaceRuntime): Promise<void> {
    await runtime.reloadActive();
    await runtime.deps.context.persistDraft();
    runtime.deps.context.setStatus(RELOADED_MESSAGE, true);
}

/**
 * Receives every save the host refused; out-of-sync refusals trigger a reload.
 * @param error - Host error text.
 */
export function handleRejectedSave(error: string): void {
    recover?.(error);
}

/**
 * Enables reload-on-refusal once workspaces are available.
 * @param runtime - Workspace runtime used to reload and save.
 */
export function bindSaveRecovery(runtime: WorkspaceRuntime): void {
    recover = (error: string): void => {
        if (!isOutOfSync(error) || isReloading) {
            return;
        }
        isReloading = true;
        reloadAfterRefusal(runtime)
            .catch((): void => {
                runtime.deps.context.setStatus(
                    "Bartleby could not reload this workspace. Restart Bartleby before making more changes.",
                    true,
                );
            })
            .finally((): void => {
                isReloading = false;
            });
    };
}
