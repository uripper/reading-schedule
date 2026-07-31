/**
 * Adapts official Tauri update/process plugins to Bartleby's update controller.
 */

import type { AppUpdateScheduler } from "@reading-schedule/contracts";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { logError } from "../../../../packages/frontend/src/types/logger.ts";
import { createAppUpdateController } from "./update-controller.ts";
import { createAppUpdateDialog } from "./update-dialog.ts";
import { startAppUpdateScheduler } from "./update-scheduler.ts";

const UPDATE_REQUEST_TIMEOUT_MS = 15_000;

// audit-allow-local-types: This dependency is private to the Tauri host.
/** Dependencies supplied by the fully initialized frontend runtime. */
interface TauriUpdaterOptions {
    flushPendingState(): Promise<boolean>;
}

/** Routes updater failures to the shared application logger. */
function reportUpdateError(message: string, error: unknown): void {
    logError(message, error);
}

/**
 * Starts background update discovery for packaged desktop builds.
 * @param options - Persistence hook used before installation and restart.
 * @returns Active scheduler, or null during local development.
 */
export function startTauriUpdater(
    options: TauriUpdaterOptions,
): AppUpdateScheduler | null {
    if (import.meta.env.DEV) {
        return null;
    }
    const CONTROLLER = createAppUpdateController({
        checkForUpdate: async () =>
            await check({ timeout: UPDATE_REQUEST_TIMEOUT_MS }),
        dialog: createAppUpdateDialog(),
        flushPendingState: options.flushPendingState,
        relaunchApp: async (): Promise<void> => {
            await relaunch();
        },
        reportError: reportUpdateError,
    });
    return startAppUpdateScheduler({
        controller: CONTROLLER,
        document,
        now: (): number => Date.now(),
        reportError: reportUpdateError,
    });
}
