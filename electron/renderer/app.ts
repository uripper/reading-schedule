import { createSplashController } from "./app/splash.js";
import { createAppBootstrapContext } from "./app/bootstrap_runtime.js";
import { initApp } from "./app/init/init_app.js";

const splash = createSplashController();
const context = createAppBootstrapContext();

await initApp(context);
splash.completeWhenReady();
