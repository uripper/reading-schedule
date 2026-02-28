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
		id: "session-1",
		book_id: "book-1",
		title: "Book 1",
		started_at: "2026-02-22T10:00:00.000Z",
		ended_at: "2026-02-22T10:25:00.000Z",
		minutes: 25,
		pages_read: 12,
		notes: "note",
		source: "manual",
		created_at: "2026-02-22T10:25:00.000Z",
		...overrides,
	};
}

test("draftData persists sessions from runtime state", () => {
	const sessions = [session()];

	const snapshot = draftData({
		sessions,
		collectBooks: () => [],
		collectSettings: () => ({}),
		preferences: {
			theme: "system",
			reduceMotion: false,
			timezone: "UTC",
			dailyGoalMinutes: 30,
			reminderEnabled: false,
			reminderTime: "20:00",
		},
		featureFlags: {
			gamificationEnabled: true,
			socialEnabled: true,
			recommendationsEnabled: true,
		},
		scheduleCompletions: {},
		blockedDayBooks: { "2026-02-22|book-2": true },
		lastResult: null,
	});

	assert.equal(snapshot.sessions.length, 1);
	assert.equal(snapshot.sessions[0].id, "session-1");
	assert.equal(snapshot.blocked_day_books["2026-02-22|book-2"], true);
});
