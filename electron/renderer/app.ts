import { createAppBootstrapContext } from "./app/bootstrap_runtime.js";
import { initApp } from "./app/init/index.js";
import { createSplashController } from "./app/splash.js";
import { logDebug, setLogLevel } from "./logger.js";
import { initRecommendationsRuntime } from "./recommendations/runtime.js";

setLogLevel("debug");
logDebug("Renderer runtime log level initialized.", {
    level: "debug",
});

const SPLASH = createSplashController();
const CONTEXT = createAppBootstrapContext();

await initApp(CONTEXT);
initRecommendationsRuntime();
SPLASH.completeWhenReady();
