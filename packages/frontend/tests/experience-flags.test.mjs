// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    normalizeFeatureFlags,
    normalizePreferences,
} from "../dist/renderer/app/experience/model.js";

test("normalizeFeatureFlags always keeps gamification enabled", () => {
    const FLAGS = normalizeFeatureFlags({
        gamificationEnabled: false,
    });

    assert.equal(FLAGS.gamificationEnabled, true);
});

test("normalizeFeatureFlags disables hidden placeholder flags", () => {
    const FLAGS = normalizeFeatureFlags({
        gamificationEnabled: false,
        socialEnabled: true,
    });

    assert.equal(FLAGS.gamificationEnabled, true);
    assert.equal(FLAGS.socialEnabled, false);
});

test("normalizePreferences rejects removed light theme", () => {
    const PREFERENCES = normalizePreferences({
        theme: "light",
    });

    assert.equal(PREFERENCES.theme, "system");
});

test("normalizePreferences disables hidden reminder settings", () => {
    const PREFERENCES = normalizePreferences({
        reminderEnabled: true,
        reminderTime: "07:15",
    });

    assert.equal(PREFERENCES.reminderEnabled, false);
    assert.equal(PREFERENCES.reminderTime, "20:00");
});
