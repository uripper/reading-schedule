// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { getPlannerApi } from "../dist/renderer/app/planner_api.js";

function previousPlannerApi() {
    return globalThis.plannerApi;
}

function restorePlannerApi(previousValue) {
    if (previousValue === undefined) {
        delete globalThis.plannerApi;
        return;
    }
    globalThis.plannerApi = previousValue;
}

test("getPlannerApi returns the preload bridge when it is present", () => {
    const PREVIOUS = previousPlannerApi();
    const API = {
        generatePlan() {
            return Promise.resolve(null);
        },
    };

    globalThis.plannerApi = API;

    try {
        assert.equal(getPlannerApi(), API);
    } finally {
        restorePlannerApi(PREVIOUS);
    }
});

test("getPlannerApi throws when the preload bridge is missing", () => {
    const PREVIOUS = previousPlannerApi();
    delete globalThis.plannerApi;

    try {
        assert.throws(() => {
            getPlannerApi();
        }, /Desktop planner API bridge not found\./u);
    } finally {
        restorePlannerApi(PREVIOUS);
    }
});
