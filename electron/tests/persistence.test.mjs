import assert from "node:assert/strict";
import test from "node:test";

import { draftData } from "../dist/renderer/app/persistence.js";

/**
 * Builds session fixture with override support.
 * @param {Record<string, unknown>} overrides Session field overrides.
 * @returns {Record<string, unknown>} Session fixture.
 */
function session(overrides = {}) {
    return {
        book_id: "book-1",
        created_at: "2026-02-22T10:25:00.000Z",
        ended_at: "2026-02-22T10:25:00.000Z",
        id: "session-1",
        minutes: 25,
        notes: "note",
        pages_read: 12,
        source: "manual",
        started_at: "2026-02-22T10:00:00.000Z",
        title: "Book 1",
        ...overrides,
    };
}

test("draftData persists sessions from runtime state", () => {
    const SESSIONS = [session()];

    const SNAPSHOT = draftData({
        blockedDayBooks: { "2026-02-22|book-2": true },
        collectBooks: () => [],
        collectSettings: () => ({}),
        featureFlags: {
            gamificationEnabled: true,
            recommendationsEnabled: true,
            socialEnabled: true,
        },
        lastResult: null,
        preferences: {
            dailyGoalMinutes: 30,
            reduceMotion: false,
            reminderEnabled: false,
            reminderTime: "20:00",
            theme: "system",
            timezone: "UTC",
        },
        scheduleCompletions: {},
        sessions: SESSIONS,
    });

    assert.equal(SNAPSHOT.sessions.length, 1);
    assert.equal(SNAPSHOT.sessions[0].id, "session-1");
    assert.equal(SNAPSHOT.blocked_day_books["2026-02-22|book-2"], true);
});
