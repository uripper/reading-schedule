import { logDebug, setLogLevel } from "../types/logger.ts";
import { finishAppStartLoading } from "./app/app-loading.ts";
import { createAppBootstrapContext } from "./app/bootstrap-runtime.ts";
import { initApp } from "./app/init/init-app.ts";

setLogLevel("debug");
logDebug("Renderer runtime log level initialized.", {
    level: "debug",
});

const CONTEXT = createAppBootstrapContext();

try {
    await initApp(CONTEXT);
} finally {
    finishAppStartLoading();
}

/**
 * Flushes the latest renderer state before the desktop host restarts the app.
 * @returns True when the final durable save succeeds.
 */
export async function flushPendingState(): Promise<boolean> {
    return await CONTEXT.flushPendingState();
}
