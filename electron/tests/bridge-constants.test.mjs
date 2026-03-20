// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const REQUIRE = createRequire(import.meta.url);
const CONSTANTS = REQUIRE("../dist/main/bridge/constants.js");

test("bridge constants expose a bounded timeout range", () => {
    assert.equal(
        CONSTANTS.BRIDGE_TIMEOUT_MS_KEY,
        "READING_PLAN_BRIDGE_TIMEOUT_MS",
    );
    assert.ok(CONSTANTS.MIN_BRIDGE_TIMEOUT_MS > 0);
    assert.ok(
        CONSTANTS.DEFAULT_BRIDGE_TIMEOUT_MS >= CONSTANTS.MIN_BRIDGE_TIMEOUT_MS,
    );
    assert.ok(
        CONSTANTS.MAX_BRIDGE_TIMEOUT_MS >= CONSTANTS.DEFAULT_BRIDGE_TIMEOUT_MS,
    );
});

test("bridge constants keep logging limits above preview limits", () => {
    assert.equal(
        CONSTANTS.PLANNER_MODULE_CANDIDATES[0],
        "reading_plan.gui_api",
    );
    assert.equal(CONSTANTS.PYTHONPATH_KEY, "PYTHONPATH");
    assert.ok(
        CONSTANTS.LOG_TAIL_MAX_BYTES > CONSTANTS.OUTPUT_PREVIEW_MAX_CHARS,
    );
    assert.ok(CONSTANTS.LOG_TAIL_MAX_LINES > 0);
});
