import { createSplashController } from "./app/splash.js";
import { createAppBootstrapContext } from "./app/bootstrap_runtime.js";
import { initApp } from "./app/init/index.js";
import { initRecommendationsRuntime } from "./recommendations/runtime.js";

const splash = createSplashController();
const context = createAppBootstrapContext();

await initApp(context);
initRecommendationsRuntime();
splash.completeWhenReady();
