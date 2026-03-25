// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    buildSessionDotStates,
    formatHeaderSessionsText,
    isHeaderGoalComplete,
    isHeaderSessionsComplete,
} from "../dist/renderer/app/today/today_header.js";

test("header sessions text formats zero counts", () => {
    assert.equal(formatHeaderSessionsText(0, 0), "0/0 logged");
});

test("header sessions text formats in-progress counts", () => {
    assert.equal(formatHeaderSessionsText(3, 5), "3/5 logged");
});

test("header session dots returns no dots when no sessions are scheduled", () => {
    assert.deepEqual(buildSessionDotStates(0, 0), []);
});

test("header session dots clamps completed sessions to scheduled count", () => {
    assert.deepEqual(buildSessionDotStates(9, 6), [
        true,
        true,
        true,
        true,
        true,
        true,
    ]);
});

test("header session dots preserves all scheduled sessions for 8+ sessions", () => {
    assert.deepEqual(buildSessionDotStates(4, 8), [
        true,
        true,
        true,
        true,
        false,
        false,
        false,
        false,
    ]);
});

test("header completion helper computes goal completion", () => {
    assert.equal(isHeaderGoalComplete(30, 30), true);
    assert.equal(isHeaderGoalComplete(29, 30), false);
});

test("header completion helper computes sessions completion", () => {
    assert.equal(isHeaderSessionsComplete(6, 7), false);
    assert.equal(isHeaderSessionsComplete(7, 7), true);
    assert.equal(isHeaderSessionsComplete(0, 0), false);
});
