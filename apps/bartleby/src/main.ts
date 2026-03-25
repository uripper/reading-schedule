import "../../../packages/frontend/styles.css";
import { installTauriPlannerApi } from "./runtime/tauri-planner-api.ts";

async function bootstrapApp(): Promise<void> {
    installTauriPlannerApi();
    await import("../../../packages/frontend/src/renderer/app.ts");
}

await bootstrapApp();
