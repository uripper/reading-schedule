/** Boots the shared Bartleby interface with browser adapters and demo controls. */

import "../../../../packages/frontend/styles.css";
import "./styles.css";
import type { PlannerApiGlobal } from "@reading-schedule/contracts";
import { createBrowserApi } from "./browser-api.ts";
import { mountDemoControls, showDemoNotice } from "./demo-controls.ts";
import { configureDemoFeatures } from "./demo-features.ts";
import { DemoStorage } from "./storage.ts";

/** Installs the browser bridge before loading the shared renderer entrypoint. */
async function bootstrapDemo(): Promise<void> {
    const STORAGE = new DemoStorage(() => globalThis.localStorage);
    mountDemoControls(STORAGE);
    configureDemoFeatures();
    // The host adds the optional global bridge declared by the shared contracts.
    const GLOBALS: PlannerApiGlobal = globalThis;
    GLOBALS.plannerApi = createBrowserApi(STORAGE);
    await import("../../../../packages/frontend/dist/renderer/app.js");
}

bootstrapDemo().catch((error: unknown) => {
    let detail = "";
    if (error instanceof Error) {
        detail = ` ${error.message}`;
    }
    showDemoNotice(
        `The demo could not start. Reload or reset the demo to retry.${detail}`,
    );
    globalThis.document.getElementById("splashScreen")?.remove();
});
