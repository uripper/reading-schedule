import "../../../packages/frontend/styles.css";
import {
    logError,
    logInfo,
} from "../../../packages/frontend/src/types/logger.ts";
import {
    installTauriPlannerApi,
    normalizeSavedCovers,
} from "./runtime/tauri-planner-api.ts";

function reportCoverMaintenanceResult(
    result: Awaited<ReturnType<typeof normalizeSavedCovers>>,
): void {
    if (!result.changed) {
        return;
    }
    logInfo("Normalized saved cover assets in the background.");
}

function reportCoverMaintenanceError(error: unknown): void {
    logError("Skipped background cover normalization.", error);
}

function startCoverMaintenance(): void {
    const COVER_MAINTENANCE = normalizeSavedCovers();
    COVER_MAINTENANCE.then(reportCoverMaintenanceResult).catch(
        reportCoverMaintenanceError,
    );
}

async function bootstrapApp(): Promise<void> {
    installTauriPlannerApi();
    await import("../../../packages/frontend/src/renderer/app.ts");
    startCoverMaintenance();
}

await bootstrapApp();
