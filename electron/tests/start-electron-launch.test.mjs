import assert from "node:assert/strict";
import test from "node:test";

import {
    cleanedEnvironment,
    createElectronLaunchSpec,
    DEVELOPMENT_FLAG,
    isDevelopmentLaunch,
} from "../scripts/electron-launcher.mjs";

const BASE_ENVIRONMENT = Object.fromEntries([
    ["ELECTRON_RUN_AS_NODE", "1"],
    ["HOME", "/tmp/home"],
    ["NODE_ENV", "production"],
]);

test("development launch flag is detected from argv", () => {
    assert.equal(isDevelopmentLaunch(["node", "script.js"]), false);
    assert.equal(
        isDevelopmentLaunch(["node", "script.js", DEVELOPMENT_FLAG]),
        true,
    );
});

test("cleanedEnvironment strips Electron-specific launch state", () => {
    const ENVIRONMENT = cleanedEnvironment(BASE_ENVIRONMENT, false);
    assert.equal(ENVIRONMENT.ELECTRON_RUN_AS_NODE, undefined);
    assert.equal(ENVIRONMENT.HOME, "/tmp/home");
    assert.equal(ENVIRONMENT.NODE_ENV, "production");
});

test("cleanedEnvironment pins NODE_ENV in development launches", () => {
    const ENVIRONMENT = cleanedEnvironment(BASE_ENVIRONMENT, true);
    assert.equal(ENVIRONMENT.ELECTRON_RUN_AS_NODE, undefined);
    assert.equal(ENVIRONMENT.HOME, "/tmp/home");
    assert.equal(ENVIRONMENT.NODE_ENV, "development");
});

test("createElectronLaunchSpec keeps the child process rooted in electron", () => {
    const SPEC = createElectronLaunchSpec({
        binaryPath: "/tmp/electron",
        cwd: "/repo/electron",
        developmentLaunch: true,
        environment: BASE_ENVIRONMENT,
    });
    assert.equal(SPEC.command, "/tmp/electron");
    assert.deepEqual(SPEC.args, ["."]);
    assert.equal(SPEC.options.cwd, "/repo/electron");
    assert.equal(SPEC.options.stdio, "inherit");
    assert.equal(SPEC.options.env.ELECTRON_RUN_AS_NODE, undefined);
    assert.equal(SPEC.options.env.HOME, "/tmp/home");
    assert.equal(SPEC.options.env.NODE_ENV, "development");
});
