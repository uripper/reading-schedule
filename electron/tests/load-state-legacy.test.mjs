import test from "node:test";
import assert from "node:assert/strict";

import { loadInitialData } from "../dist/renderer/app/load_state.js";

const DEFAULT_PREFERENCES = {
  theme: "system",
  reduceMotion: false,
  timezone: "UTC",
  dailyGoalMinutes: 30,
  reminderEnabled: false,
  reminderTime: "20:00",
};

const DEFAULT_FEATURE_FLAGS = {
  gamificationEnabled: true,
  socialEnabled: true,
  recommendationsEnabled: true,
};

/**
 * Builds load-state args with override hooks for legacy-shape assertions.
 * @param {import("../dist/types/types.js").PlannerStateLoadResult} loadResult Structured load result fixture.
 * @param {Partial<import("../dist/types/types_app.js").LoadStateArgs>} overrides Override hooks for targeted assertions.
 * @returns {import("../dist/types/types_app.js").LoadStateArgs} Load arguments.
 */
function loadArgs(loadResult, overrides = {}) {
  const noop = () => undefined;
  const base = {
    plannerApi: {
      loadState: () => Promise.resolve(loadResult),
      sample: () =>
        Promise.resolve({ settings: { start_date: "2026-04-01" }, books: [] }),
    },
    fillSettings: noop,
    fillBooks: noop,
    normalizePreferences: () => DEFAULT_PREFERENCES,
    normalizeFeatureFlags: (value) => ({
      ...DEFAULT_FEATURE_FLAGS,
      ...value,
    }),
    normalizeScheduleCompletions: (value) => value,
    fillPreferencesUI: noop,
    applyPreferencesToDocument: noop,
    setPreferences: noop,
    setFeatureFlags: noop,
    setScheduleCompletions: noop,
    setBlockedDayBooks: noop,
    setSessions: noop,
    applyLoadedResult: noop,
    updateTodayView: noop,
    onLoaded: noop,
    setStatus: noop,
    addLog: noop,
  };
  return { ...base, ...overrides };
}

test("loadInitialData restores legacy session/completion/result shapes", async () => {
  let capturedSessions = [];
  let capturedCompletions = {};
  let capturedBlocked = {};
  let capturedResult = null;
  let capturedFeatureFlags = null;
  const logs = [];

  await loadInitialData(
    loadArgs(
      {
        source: "json_primary",
        sourcePath:
          "C:/Users/example/AppData/Roaming/reading-plan-gui/planner_state.json",
        state: {
          settings: { start_date: "2026-05-01" },
          books: [],
          session_history: {
            first: {
              book_id: "book-1",
              title: "Legacy Session",
              minutes: 12,
              startedAt: "2026-05-01T10:00:00.000Z",
              endedAt: "2026-05-01T10:12:00.000Z",
              source: "manual",
            },
          },
          lastResult: {
            schedule: [
              {
                date: "2026-05-01",
                session_index: 0,
                book_id: "book-1",
                title: "Legacy Session",
                minutes: 12,
                words_planned: 100,
              },
            ],
            summary: null,
            created_at: "2026-05-01T12:00:00.000Z",
          },
          scheduleCompletions: {
            "2026-05-01|0|book-1": true,
          },
          blockedDayBooks: {
            "2026-05-01|book-1": 1,
          },
          featureFlags: {
            gamificationEnabled: false,
          },
        },
        warningCode: "MIGRATED_JSON_TO_SQLITE",
      },
      {
        setSessions: (sessions) => {
          capturedSessions = sessions;
        },
        setScheduleCompletions: (completions) => {
          capturedCompletions = completions;
        },
        setBlockedDayBooks: (blocked) => {
          capturedBlocked = blocked;
        },
        applyLoadedResult: (result) => {
          capturedResult = result;
        },
        setFeatureFlags: (flags) => {
          capturedFeatureFlags = flags;
        },
        addLog: (message) => {
          logs.push(message);
        },
      },
    ),
  );

  assert.equal(capturedSessions.length, 1);
  assert.equal(capturedSessions[0].book_id, "book-1");
  assert.equal(capturedSessions[0].source, "manual");
  assert.equal(capturedSessions[0].ended_at, "2026-05-01T10:12:00.000Z");
  assert.equal(capturedCompletions["2026-05-01|0|book-1"], true);
  assert.equal(capturedBlocked["2026-05-01|book-1"], true);
  assert.equal(capturedResult.schedule.length, 1);
  assert.equal(capturedFeatureFlags.gamificationEnabled, false);
  assert.equal(
    logs.some((entry) => entry.includes("State load source: json_primary")),
    true,
  );
});
