// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeState } from "../dist/renderer/app/runtime_state.js";

function assertDefaultStateValues(state) {
    assert.deepEqual(state.blockedDayBooks, {});
    assert.deepEqual(state.scheduleCompletions, {});
    assert.deepEqual(state.sessions, []);
    assert.equal(state.lastResult, null);
    assert.equal(state.ready, false);
    assert.deepEqual(state.featureFlags, {
        gamificationEnabled: false,
        recommendationsEnabled: false,
        socialEnabled: false,
    });
    assert.deepEqual(state.preferences, {
        dailyGoalMinutes: 30,
        reduceMotion: false,
        reminderEnabled: false,
        reminderTime: "20:00",
        theme: "system",
        timezone: state.preferences.timezone,
    });
    assert.match(state.preferences.timezone, /\S/u);
}

function assertDefaultDerivedIndexes(state) {
    assert.ok(state.derived.bookById instanceof Map);
    assert.ok(state.derived.sessionsByBook instanceof Map);
    assert.ok(state.derived.sessionsByDay instanceof Map);
    assert.deepEqual(state.derived.completionByDayBookKey, {});
    assert.deepEqual(state.derived.completionBySessionKey, {});
}

test("createRuntimeState returns empty mutable runtime containers", () => {
    const STATE = createRuntimeState();
    assertDefaultStateValues(STATE);
    assertDefaultDerivedIndexes(STATE);
});

test("createRuntimeState clones nested defaults for each call", () => {
    const FIRST_STATE = createRuntimeState();
    const SECOND_STATE = createRuntimeState();

    FIRST_STATE.blockedDayBooks["2026-03-19"] = ["book-1"];
    FIRST_STATE.featureFlags.gamificationEnabled = true;
    FIRST_STATE.preferences.dailyGoalMinutes = 99;
    FIRST_STATE.derived.completionBySessionKey["session-1"] = true;

    assert.deepEqual(SECOND_STATE.blockedDayBooks, {});
    assert.equal(SECOND_STATE.featureFlags.gamificationEnabled, false);
    assert.equal(SECOND_STATE.preferences.dailyGoalMinutes, 30);
    assert.deepEqual(SECOND_STATE.derived.completionBySessionKey, {});
});
