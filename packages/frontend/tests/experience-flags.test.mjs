// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("normalizePreferences discards legacy theme preferences", () => {
    const PREFERENCES = normalizePreferences({
        theme: "light",
    });

    assert.equal(Object.hasOwn(PREFERENCES, "theme"), false);
});

test("normalizePreferences disables hidden reminder settings", () => {
    const PREFERENCES = normalizePreferences({
        reminderEnabled: true,
        reminderTime: "07:15",
    });

    assert.equal(PREFERENCES.reminderEnabled, false);
    assert.equal(PREFERENCES.reminderTime, "20:00");
});

test("built styles expose only the dark color scheme", () => {
    const FOUNDATION_CSS = readFileSync(
        new URL("../dist/styles/base-foundation.css", import.meta.url),
        "utf8",
    );
    const TOKEN_CSS = readFileSync(
        new URL("../dist/styles/generated/tokens.css", import.meta.url),
        "utf8",
    );
    const INDEX_HTML = readFileSync(
        new URL("../dist/index.html", import.meta.url),
        "utf8",
    );

    assert.match(FOUNDATION_CSS, /color-scheme:\s*dark/u);
    assert.doesNotMatch(FOUNDATION_CSS, /prefers-color-scheme|data-theme/u);
    assert.doesNotMatch(TOKEN_CSS, /semantic-(?:dark|light)|data-theme/u);
    assert.match(INDEX_HTML, /name="color-scheme" content="dark"/u);
    assert.doesNotMatch(INDEX_HTML, /data-theme/u);
});
