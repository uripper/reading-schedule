import assert from "node:assert/strict";
import test from "node:test";

import {
    normalizeFeatureFlags,
    normalizePreferences,
} from "../dist/renderer/app/experience.js";

test("normalizeFeatureFlags keeps shipped gamification flag", () => {
    const FLAGS = normalizeFeatureFlags({
        gamificationEnabled: true,
    });

    assert.equal(FLAGS.gamificationEnabled, true);
});

test("normalizeFeatureFlags disables hidden placeholder flags", () => {
    const FLAGS = normalizeFeatureFlags({
        gamificationEnabled: false,
        recommendationsEnabled: true,
        socialEnabled: true,
    });

    assert.equal(FLAGS.socialEnabled, false);
    assert.equal(FLAGS.recommendationsEnabled, false);
});

test("normalizePreferences disables hidden reminder settings", () => {
    const PREFERENCES = normalizePreferences({
        reminderEnabled: true,
        reminderTime: "07:15",
    });

    assert.equal(PREFERENCES.reminderEnabled, false);
    assert.equal(PREFERENCES.reminderTime, "20:00");
});
