import { completeFoundationBootstrap } from "./runtime/foundation-bootstrap.ts";
import { startFrontendRenderer } from "./runtime/frontend-renderer.ts";
import { installFrontendShell } from "./runtime/frontend-shell.ts";
import { installTauriPlannerApi } from "./runtime/tauri-planner-api.ts";

const FRONTEND_RENDERER_FALLBACK_MESSAGE =
    "Tauri foundation loaded, but the shared frontend bundle could not start.";

function failureMessage(error: unknown): string {
    if (error instanceof Error && error.message.length > 0) {
        return `${FRONTEND_RENDERER_FALLBACK_MESSAGE} ${error.message}`;
    }
    return FRONTEND_RENDERER_FALLBACK_MESSAGE;
}

async function bootstrapApp(): Promise<void> {
    installFrontendShell();
    installTauriPlannerApi();
    try {
        await startFrontendRenderer();
    } catch (error) {
        completeFoundationBootstrap(failureMessage(error));
    }
}

await bootstrapApp();
