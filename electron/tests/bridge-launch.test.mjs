/**
 * Regression tests for planner launch resolution.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REQUIRE = createRequire(import.meta.url);
const { resolvePlannerLaunch } = REQUIRE("../dist/main/bridge/launch.js");
const { processEnvironment } = REQUIRE("../dist/main/runtime-env.js");
const ENVIRONMENT = processEnvironment();
const PLANNER_PATH_ENV_KEY = "BARTLEBY_PLANNER_PATH";
const PYTHON_BIN_ENV_KEY = "PYTHON_BIN";
const RESOURCES_PATH_ENV_KEY = "BARTLEBY_RESOURCES_PATH";
const TEST_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const ELECTRON_DIRECTORY = path.resolve(TEST_DIRECTORY, "..");
const REPOSITORY_DIRECTORY = path.resolve(ELECTRON_DIRECTORY, "..");

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
 * Temporarily overrides environment values for a test callback.
 * @param entries - Key/value overrides.
 * @param action - Test callback executed with overrides.
 * @returns Callback return value.
 */
function withEnvironmentEntries(entries, action) {
    const PREVIOUS_VALUES = new Map();
    for (const [NAME, VALUE] of entries) {
        PREVIOUS_VALUES.set(NAME, ENVIRONMENT[NAME]);
        if (VALUE === undefined) {
            delete ENVIRONMENT[NAME];
        } else {
            ENVIRONMENT[NAME] = VALUE;
        }
    }
    try {
        return action();
    } finally {
        for (const [NAME, PREVIOUS_VALUE] of PREVIOUS_VALUES) {
            restoreEnvironmentValue(NAME, PREVIOUS_VALUE);
        }
    }
}

test("planner launch uses python module execution during development", () => {
    const PYTHON_BINARY = "/tmp/custom-python";
    const LAUNCH = withEnvironmentEntries(
        [
            [PLANNER_PATH_ENV_KEY, undefined],
            [PYTHON_BIN_ENV_KEY, PYTHON_BINARY],
            [RESOURCES_PATH_ENV_KEY, undefined],
        ],
        () => resolvePlannerLaunch("reading_plan.gui_api", ["--sample"]),
    );
    assert.equal(LAUNCH.command, PYTHON_BINARY);
    assert.deepEqual(LAUNCH.args, ["-m", "reading_plan.gui_api", "--sample"]);
    assert.equal(LAUNCH.cwd, REPOSITORY_DIRECTORY);
});

test("planner launch switches to bundled executable when available", () => {
    const TEMP_DIRECTORY = fs.mkdtempSync(
        path.join(os.tmpdir(), "bartleby-bridge-launch-"),
    );
    const RESOURCES_DIRECTORY = path.join(TEMP_DIRECTORY, "resources");
    const PLANNER_DIRECTORY = path.join(RESOURCES_DIRECTORY, "planner");
    const PLANNER_PATH = path.join(PLANNER_DIRECTORY, "planner-bridge.exe");
    fs.mkdirSync(PLANNER_DIRECTORY, { recursive: true });
    fs.writeFileSync(PLANNER_PATH, "");
    try {
        const LAUNCH = withEnvironmentEntries(
            [
                [PLANNER_PATH_ENV_KEY, PLANNER_PATH],
                [PYTHON_BIN_ENV_KEY, "/tmp/custom-python"],
                [RESOURCES_PATH_ENV_KEY, RESOURCES_DIRECTORY],
            ],
            () => resolvePlannerLaunch("reading_plan.gui_api", ["--sample"]),
        );
        assert.equal(LAUNCH.command, PLANNER_PATH);
        assert.deepEqual(LAUNCH.args, ["reading_plan.gui_api", "--sample"]);
        assert.equal(LAUNCH.cwd, RESOURCES_DIRECTORY);
    } finally {
        fs.rmSync(TEMP_DIRECTORY, { force: true, recursive: true });
    }
});
