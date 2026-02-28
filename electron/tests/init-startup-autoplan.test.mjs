import assert from "node:assert/strict";
import test from "node:test";

import { shouldAutoPlanOnStartup } from "../dist/renderer/app/init/init_helpers.js";

/**
 * Builds a minimal load result fixture for startup auto-plan policy checks.
 * @param {"fresh"|"sqlite"|"json_primary"} source Persistence source.
 * @returns {{ source: "fresh"|"sqlite"|"json_primary" }} Minimal load result.
 */
function loadResult(source) {
	return { source };
}

/**
 * Builds minimal startup args fixture for auto-plan policy checks.
 * @param {number|null} scheduleLength Number of saved schedule rows or null for no saved state.
 * @param {"fresh"|"sqlite"|"json_primary"} source Persistence source.
 * @returns {{ saved: null|{ last_result: { schedule: Array<{date: string}> } }, loadResult: { source: "fresh"|"sqlite"|"json_primary" } }}
 * Startup args with saved payload and load metadata.
 */
function startupArgs(scheduleLength, source) {
	let saved = null;
	if (scheduleLength !== null) {
		saved = savedPayload(scheduleLength);
	}
	return {
		saved,
		loadResult: loadResult(source),
	};
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
	assert.equal(shouldAutoPlanOnStartup(startupArgs(1, "sqlite")), false);
	assert.equal(shouldAutoPlanOnStartup(startupArgs(2, "json_primary")), false);
});

test("startup auto-plans when saved schedule is missing or empty", () => {
	assert.equal(shouldAutoPlanOnStartup(startupArgs(null, "sqlite")), true);
	assert.equal(shouldAutoPlanOnStartup(startupArgs(0, "sqlite")), true);
});

test("startup auto-plans for fresh-reset loads even when rows exist", () => {
	assert.equal(shouldAutoPlanOnStartup(startupArgs(3, "fresh")), true);
});
