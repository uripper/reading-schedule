/** Rejects invalid transport data at the browser worker boundary. */

import assert from "node:assert/strict";
import test from "node:test";
import {
    parseBrowserPlannerRequest,
    parseBrowserPlannerResponse,
} from "@reading-schedule/contracts";
import { createDemoSample } from "../src/demo/sample.ts";

const REQUEST_ID = 1;

test("worker requests preserve books and reading settings", () => {
    const PAYLOAD = createDemoSample();
    const REQUEST = parseBrowserPlannerRequest({
        id: REQUEST_ID,
        payload: PAYLOAD,
    });
    assert.deepEqual(REQUEST.payload, PAYLOAD);
});

test("worker requests reject invalid IDs and missing planner input", () => {
    assert.throws(() =>
        parseBrowserPlannerRequest({ id: -1, payload: createDemoSample() }),
    );
    assert.throws(() =>
        parseBrowserPlannerRequest({ id: REQUEST_ID, payload: {} }),
    );
});

test("worker failures retain actionable error details", () => {
    const RESPONSE = parseBrowserPlannerResponse({
        error: "Invalid reading budget",
        id: REQUEST_ID,
        ok: false,
    });
    assert.deepEqual(RESPONSE, {
        error: "Invalid reading budget",
        id: REQUEST_ID,
        ok: false,
    });
});

test("worker success cannot carry malformed schedules", () => {
    assert.throws(() =>
        parseBrowserPlannerResponse({
            id: REQUEST_ID,
            ok: true,
            result: { schedule: "broken", summary: {} },
        }),
    );
    assert.throws(() =>
        parseBrowserPlannerResponse({ error: {}, id: REQUEST_ID, ok: false }),
    );
});
