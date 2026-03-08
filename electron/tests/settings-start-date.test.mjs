/**
 * Verifies start-date defaults used by the settings form serializer/fill flow.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { normalizePlannerStartDate } from "../dist/renderer/settings/start_date.js";

const MINIMUM_START_DATE = "2026-03-07";

test("normalizePlannerStartDate defaults blank values to the minimum date", () => {
    assert.equal(
        normalizePlannerStartDate("", MINIMUM_START_DATE),
        MINIMUM_START_DATE,
    );
    assert.equal(
        normalizePlannerStartDate(undefined, MINIMUM_START_DATE),
        MINIMUM_START_DATE,
    );
});

test("normalizePlannerStartDate clamps past values to the minimum date", () => {
    assert.equal(
        normalizePlannerStartDate("2026-03-01", MINIMUM_START_DATE),
        MINIMUM_START_DATE,
    );
});

test("normalizePlannerStartDate keeps valid future values", () => {
    assert.equal(
        normalizePlannerStartDate("2026-03-15", MINIMUM_START_DATE),
        "2026-03-15",
    );
});
