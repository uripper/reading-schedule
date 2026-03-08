/**
 * Verifies planner request normalization for desktop plan generation.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
    normalizePlannerEndDate,
    normalizePlannerStartDate,
    plannerTokenFromProfile,
} from "../dist/renderer/app/plan_normalize.js";

const MINIMUM_START_DATE = "2026-03-07";

test("normalizePlannerStartDate clamps past dates to today", () => {
    assert.equal(
        normalizePlannerStartDate("1999-01-01", MINIMUM_START_DATE),
        MINIMUM_START_DATE,
    );
});

test("normalizePlannerStartDate defaults blank dates to today", () => {
    assert.equal(
        normalizePlannerStartDate("", MINIMUM_START_DATE),
        MINIMUM_START_DATE,
    );
});

test("normalizePlannerEndDate clamps past end dates up to the start date", () => {
    assert.equal(
        normalizePlannerEndDate("1999-01-01", MINIMUM_START_DATE),
        MINIMUM_START_DATE,
    );
});

test("normalizePlannerEndDate keeps valid future end dates", () => {
    assert.equal(
        normalizePlannerEndDate("2099-01-01", MINIMUM_START_DATE),
        "2099-01-01",
    );
});

test("plannerTokenFromProfile keeps solver profile mapping intact", () => {
    assert.equal(plannerTokenFromProfile(undefined), "mip");
    assert.equal(plannerTokenFromProfile("fast"), "mip-fast");
    assert.equal(plannerTokenFromProfile("balanced"), "mip-balanced");
    assert.equal(plannerTokenFromProfile("thorough"), "mip-thorough");
});
