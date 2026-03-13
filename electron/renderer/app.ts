import { createAppBootstrapContext } from "./app/bootstrap_runtime.ts";
import { initApp } from "./app/init/index.ts";
import { createSplashController } from "./app/splash.ts";
import { logDebug, setLogLevel } from "./logger.ts";
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
