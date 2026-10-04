/** Browser implementation of the shared frontend's platform boundary. */

import type { PlannerApi } from "@reading-schedule/contracts";
import { BrowserPlanner } from "./planner-client.ts";
import { createDemoSample } from "./sample.ts";
import type { DemoStorage } from "./storage.ts";

/** Explains features reserved for the installed app if invoked programmatically. */
async function desktopOnly(): Promise<never> {
    await Promise.resolve();
    throw new Error(
        "This feature is available in the desktop app. Download Bartleby to use it.",
    );
}

/** Provides the native API shape while storing demo data only in this browser. */
export function createBrowserApi(storage: DemoStorage): PlannerApi {
    const PLANNER = new BrowserPlanner();
    return {
        ...createDesktopOnlyApi(),
        async generate(payload) {
            return await PLANNER.generate(payload);
        },
        async loadState() {
            return await Promise.resolve(storage.load());
        },
        nativeZoom: false,
        async sample() {
            return await Promise.resolve(createDemoSample());
        },
        async saveState(state) {
            return await Promise.resolve(storage.save(state));
        },
    };
}

/** Defines explicit boundaries for features outside the first browser demo. */
function createDesktopOnlyApi(): Omit<
    PlannerApi,
    "generate" | "loadState" | "sample" | "saveState"
> {
    return {
        async downloadCover(url) {
            return await Promise.resolve(url ?? "");
        },
        exportAppData: desktopOnly,
        importAppData: desktopOnly,
        resolveCoverSrc: (src) => src ?? "",
        saveUploadedCover: desktopOnly,
        searchBooks: desktopOnly,
        zoomIn: desktopOnly,
        zoomOut: desktopOnly,
        zoomReset: desktopOnly,
    };
}
