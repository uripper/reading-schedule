/**
 * Regression tests for bridge root and packaged-env resolution.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REQUIRE = createRequire(import.meta.url);
const { processEnvironment } = REQUIRE("../dist/main/runtime-env.js");
const { resolveExecutionContext, root } = REQUIRE(
    "../dist/main/bridge/context.js",
);
const ENVIRONMENT = processEnvironment();
const PLANNER_PATH_ENV_KEY = "BARTLEBY_PLANNER_PATH";
const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ELECTRON_DIRECTORY = path.resolve(TEST_DIRECTORY, "..");
const REPOSITORY_DIRECTORY = path.resolve(ELECTRON_DIRECTORY, "..");
const SOURCE_DIRECTORY = path.join(REPOSITORY_DIRECTORY, "src");

/**
 * Restores one environment value after a test override.
 * @param name - Environment variable name.
 * @param previousValue - Previous environment value.
 */
function restoreEnvironmentValue(name, previousValue) {
    if (previousValue === undefined) {
        delete ENVIRONMENT[name];
        return;
    }
    ENVIRONMENT[name] = previousValue;
}

/**
 * Temporarily overrides one environment variable for a test callback.
 * @param name - Environment variable name.
 * @param nextValue - Override value to apply.
 * @param action - Test callback executed with the override.
 * @returns Callback return value.
 */
function withEnvironmentValue(name, nextValue, action) {
    const PREVIOUS_VALUE = ENVIRONMENT[name];
    if (nextValue === undefined) {
        delete ENVIRONMENT[name];
    } else {
        ENVIRONMENT[name] = nextValue;
    }
    try {
        return action();
    } finally {
        restoreEnvironmentValue(name, PREVIOUS_VALUE);
    }
}

test("bridge root resolves to repository directory", () => {
    assert.equal(root(), REPOSITORY_DIRECTORY);
});

test("bridge execution context sets repository src as PYTHONPATH", () => {
    const CONTEXT = resolveExecutionContext();
    assert.equal(CONTEXT.env.PYTHONPATH, SOURCE_DIRECTORY);
});

test("bridge execution context skips PYTHONPATH when bundled planner exists", () => {
    const TEMP_DIRECTORY = fs.mkdtempSync(
        path.join(os.tmpdir(), "bartleby-bridge-context-"),
    );
    const PLANNER_PATH = path.join(TEMP_DIRECTORY, "planner-bridge.exe");
    fs.writeFileSync(PLANNER_PATH, "");
    try {
        withEnvironmentValue(PLANNER_PATH_ENV_KEY, PLANNER_PATH, () => {
            const CONTEXT = resolveExecutionContext();
            assert.equal(CONTEXT.env.PYTHONPATH, undefined);
        });
    } finally {
        fs.rmSync(TEMP_DIRECTORY, { force: true, recursive: true });
    }
});
