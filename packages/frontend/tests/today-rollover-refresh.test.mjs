// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { refreshForLocalDayRollover } from "../dist/renderer/app/today/today-rollover-refresh.js";

test("local-day rollover refreshes the UI before queueing a replan", () => {
    const CALLS = [];

    refreshForLocalDayRollover({
        queueAutoPlan: () => {
            CALLS.push("plan");
        },
        renderCurrentSchedule: () => {
            CALLS.push("render");
        },
        resetTodayUi: () => {
            CALLS.push("reset");
        },
        updateDashboards: () => {
            CALLS.push("dashboards");
        },
    });

    assert.deepEqual(CALLS, ["reset", "render", "dashboards", "plan"]);
});
