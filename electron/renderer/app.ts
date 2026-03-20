import { logDebug, setLogLevel } from "../types/logger.ts";
import { createAppBootstrapContext } from "./app/bootstrap-runtime.ts";
import { initApp } from "./app/init/init-app.ts";
import { createSplashController } from "./app/splash.ts";
import { initRecommendationsRuntime } from "./recommendations/runtime.ts";

setLogLevel("debug");
logDebug("Renderer runtime log level initialized.", {
    level: "debug",
});

const SPLASH = createSplashController();
const CONTEXT = createAppBootstrapContext();

await initApp(CONTEXT);
initRecommendationsRuntime();
SPLASH.completeWhenReady();
