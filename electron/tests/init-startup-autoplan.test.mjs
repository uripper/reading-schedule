import test from "node:test";
import assert from "node:assert/strict";

import { shouldAutoPlanOnStartup } from "../dist/renderer/app/init/init_helpers.js";

/**
 * Builds a minimal load result fixture for startup auto-plan policy checks.
 * @param {"fresh"|"sqlite"|"json_primary"} source Persistence source.
 * @returns {{ source: string }} Minimal load result.
 */
function loadResult(source) {
  return { source };
}

/**
 * Builds minimal saved payload fixture for startup auto-plan policy checks.
 * @param {number} scheduleLength Number of saved schedule rows.
 * @returns {{ last_result: { schedule: Array<{date: string}> }}} Saved payload fixture.
 */
function savedPayload(scheduleLength) {
  const schedule = [];
  for (let index = 0; index < scheduleLength; index += 1) {
    schedule.push({ date: "2026-02-27" });
  }
  return {
    last_result: { schedule },
  };
}

test("startup skips auto-plan when non-fresh load includes saved schedule rows", () => {
  assert.equal(
    shouldAutoPlanOnStartup(savedPayload(1), loadResult("sqlite")),
    false,
  );
  assert.equal(
    shouldAutoPlanOnStartup(savedPayload(2), loadResult("json_primary")),
    false,
  );
});

test("startup auto-plans when saved schedule is missing or empty", () => {
  assert.equal(shouldAutoPlanOnStartup(null, loadResult("sqlite")), true);
  assert.equal(
    shouldAutoPlanOnStartup(savedPayload(0), loadResult("sqlite")),
    true,
  );
});

test("startup auto-plans for fresh-reset loads even when rows exist", () => {
  assert.equal(
    shouldAutoPlanOnStartup(savedPayload(3), loadResult("fresh")),
    true,
  );
});
