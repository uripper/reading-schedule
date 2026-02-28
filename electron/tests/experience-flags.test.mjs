import assert from "node:assert/strict";
import test from "node:test";

import {
    normalizeFeatureFlags,
    normalizePreferences,
} from "../dist/renderer/app/experience.js";

test("normalizeFeatureFlags keeps shipped gamification flag", () => {
    const flags = normalizeFeatureFlags({
        gamificationEnabled: true,
    });

    assert.equal(flags.gamificationEnabled, true);
});

test("normalizeFeatureFlags disables hidden placeholder flags", () => {
    const flags = normalizeFeatureFlags({
        gamificationEnabled: false,
        recommendationsEnabled: true,
        socialEnabled: true,
    });

    assert.equal(flags.socialEnabled, false);
    assert.equal(flags.recommendationsEnabled, false);
});

test("normalizePreferences disables hidden reminder settings", () => {
    const preferences = normalizePreferences({
        reminderEnabled: true,
        reminderTime: "07:15",
    });

    assert.equal(preferences.reminderEnabled, false);
    assert.equal(preferences.reminderTime, "20:00");
});
