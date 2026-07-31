/**
 * Boots the Tauri desktop shell, shared frontend, maintenance, and updater.
 */

import "../../../packages/frontend/styles.css";
import "./styles/update-dialog.css";
import {
    logError,
    logInfo,
} from "../../../packages/frontend/src/types/logger.ts";
import {
    installTauriPlannerApi,
    runStateMaintenance,
} from "./runtime/tauri-planner-api.ts";
import { startTauriUpdater } from "./updater/tauri-updater.ts";

/** Reports completed background state maintenance when data changed. */
function reportStateMaintenanceResult(
    result: Awaited<ReturnType<typeof runStateMaintenance>>,
): void {
    if (!result.changed) {
        return;
    }
    logInfo("Cleaned saved state in the background.", {
        coversDeleted: result.coversDeleted,
        sqliteJournalRowsDeleted: result.sqliteJournalRowsDeleted,
        stateRepaired: result.stateRepaired,
    });
}

/** Reports a recoverable background state-maintenance failure. */
function reportStateMaintenanceError(error: unknown): void {
    logError("Skipped background state maintenance.", error);
}

/** Starts non-blocking state maintenance after the frontend is ready. */
function startStateMaintenance(): void {
    const STATE_MAINTENANCE = runStateMaintenance();
    STATE_MAINTENANCE.then(reportStateMaintenanceResult).catch(
        reportStateMaintenanceError,
    );
}

/** Installs native adapters and starts the shared frontend runtime. */
async function bootstrapApp(): Promise<void> {
    installTauriPlannerApi();
    const FRONTEND = await import(
        "../../../packages/frontend/src/renderer/app.ts"
    );
    startTauriUpdater({
        flushPendingState: FRONTEND.flushPendingState,
    });
    startStateMaintenance();
}

await bootstrapApp();
