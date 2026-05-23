import "../../../packages/frontend/styles.css";
import {
    logError,
    logInfo,
} from "../../../packages/frontend/src/types/logger.ts";
import {
    installTauriPlannerApi,
    runStateMaintenance,
} from "./runtime/tauri-planner-api.ts";

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

function reportStateMaintenanceError(error: unknown): void {
    logError("Skipped background state maintenance.", error);
}

function startStateMaintenance(): void {
    const STATE_MAINTENANCE = runStateMaintenance();
    STATE_MAINTENANCE.then(reportStateMaintenanceResult).catch(
        reportStateMaintenanceError,
    );
}

async function bootstrapApp(): Promise<void> {
    installTauriPlannerApi();
    await import("../../../packages/frontend/src/renderer/app.ts");
    startStateMaintenance();
}

await bootstrapApp();
