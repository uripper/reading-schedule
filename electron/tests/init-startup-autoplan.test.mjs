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
function _startupArgs(scheduleLength, source) {
    let saved = null;
    if (scheduleLength !== null) {
        saved = savedPayload(scheduleLength);
    }
    return {
        loadResult: loadResult(source),
        saved,
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
