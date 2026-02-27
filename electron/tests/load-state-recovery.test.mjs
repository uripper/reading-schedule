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
 * Builds load-state args with capture arrays for status/log assertions.
 * @param {import("../dist/types/types.js").PlannerStateLoadResult} loadResult Structured load result fixture.
 * @param {Array<{ message: string, isError: boolean }>} statuses Captured statuses sink.
 * @param {string[]} logs Captured logs sink.
 * @returns {import("../dist/types/types_app.js").LoadStateArgs} Load arguments.
 */
function loadArgs(loadResult, statuses, logs) {
  const noop = () => undefined;
  return {
    plannerApi: {
      loadState: () => Promise.resolve(loadResult),
      sample: () =>
        Promise.resolve({ settings: { start_date: "2026-04-01" }, books: [] }),
    },
    fillSettings: noop,
    fillBooks: noop,
    normalizePreferences: () => DEFAULT_PREFERENCES,
    normalizeFeatureFlags: () => DEFAULT_FEATURE_FLAGS,
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
    setStatus: (message, isError = false) => {
      statuses.push({ message, isError });
    },
    addLog: (message) => {
      logs.push(message);
    },
  };
}

test("loadInitialData surfaces backup/journal/fresh recovery warnings", async () => {
  const statuses = [];
  const logs = [];

  await loadInitialData(
    loadArgs(
      {
        source: "json_backup",
        state: { settings: { start_date: "2026-04-01" }, books: [] },
        warningCode: "RECOVERED_FROM_BACKUP",
      },
      statuses,
      logs,
    ),
  );
  await loadInitialData(
    loadArgs(
      {
        source: "sqlite_journal_replay",
        state: { settings: { start_date: "2026-04-02" }, books: [] },
        warningCode: "RECOVERED_FROM_JOURNAL",
      },
      statuses,
      logs,
    ),
  );
  await loadInitialData(
    loadArgs(
      {
        source: "fresh",
        state: null,
        warningCode: "STATE_RESET_FRESH",
      },
      statuses,
      logs,
    ),
  );

  assert.equal(
    statuses.some((entry) => entry.message.includes("backup copy")),
    true,
  );
  assert.equal(
    statuses.some((entry) => entry.message.includes("journal replay")),
    true,
  );
  assert.equal(
    statuses.some((entry) => entry.message.includes("Started with fresh data")),
    true,
  );
  assert.equal(
    logs.some((entry) => entry.includes("Migrated saved data from JSON")),
    true,
  );
});

test("loadInitialData logs migration info for json-primary loads", async () => {
  const statuses = [];
  const logs = [];

  await loadInitialData(
    loadArgs(
      {
        source: "json_primary",
        state: { settings: { start_date: "2026-05-01" }, books: [] },
        warningCode: "MIGRATED_JSON_TO_SQLITE",
      },
      statuses,
      logs,
    ),
  );

  assert.equal(statuses.length, 0);
  assert.equal(
    logs.some((entry) => entry.includes("Migrated saved data from JSON")),
    true,
  );
});
