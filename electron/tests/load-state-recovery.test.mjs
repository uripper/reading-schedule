import assert from "node:assert/strict";
import test from "node:test";

import { loadInitialData } from "../dist/renderer/app/load_state.js";

const DEFAULT_PREFERENCES = {
    dailyGoalMinutes: 30,
    reduceMotion: false,
    reminderEnabled: false,
    reminderTime: "20:00",
    theme: "system",
    timezone: "UTC",
};

const DEFAULT_FEATURE_FLAGS = {
    gamificationEnabled: true,
    recommendationsEnabled: true,
    socialEnabled: true,
};

/**
 * Builds load-state args with capture arrays for status/log assertions.
 * @param {import("../dist/types/types.js").PlannerStateLoadResult} loadResult Structured load result fixture.
 * @param {Array<{ message: string, isError: boolean }>} statuses Captured statuses sink.
 * @param {string[]} logs Captured logs sink.
 * @param {Partial<import("../dist/types/types_app.js").LoadStateArgs>} overrides Override hooks for targeted assertions.
 * @returns {import("../dist/types/types_app.js").LoadStateArgs} Load arguments.
 */
function loadArgs(loadResult, statuses, logs, overrides = {}) {
    const noop = () => undefined;
    const base = {
        addLog: (message) => {
            logs.push(message);
        },
        applyLoadedResult: noop,
        applyPreferencesToDocument: noop,
        fillBooks: noop,
        fillPreferencesUI: noop,
        fillSettings: noop,
        normalizeFeatureFlags: () => DEFAULT_FEATURE_FLAGS,
        normalizePreferences: () => DEFAULT_PREFERENCES,
        normalizeScheduleCompletions: (value) => value,
        onLoaded: noop,
        plannerApi: {
            loadState: () => Promise.resolve(loadResult),
            sample: () =>
                Promise.resolve({
                    books: [],
                    settings: { start_date: "2026-04-01" },
                }),
        },
        setBlockedDayBooks: noop,
        setFeatureFlags: noop,
        setPreferences: noop,
        setScheduleCompletions: noop,
        setSessions: noop,
        setStatus: (message, isError = false) => {
            statuses.push({ isError, message });
        },
        updateTodayView: noop,
    };
    return { ...base, ...overrides };
}

test("loadInitialData surfaces backup/journal/fresh recovery warnings", async () => {
    const statuses = [];
    const logs = [];

    await loadInitialData(
        loadArgs(
            {
                source: "json_backup",
                state: { books: [], settings: { start_date: "2026-04-01" } },
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
                state: { books: [], settings: { start_date: "2026-04-02" } },
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
        statuses.some((entry) =>
            entry.message.includes("Started with fresh data"),
        ),
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
                sourcePath: "/tmp/planner_state.json",
                state: { books: [], settings: { start_date: "2026-05-01" } },
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
    assert.equal(
        logs.some((entry) => entry.includes("State load source: json_primary")),
        true,
    );
    assert.equal(
        logs.some((entry) => entry.includes("/tmp/planner_state.json")),
        true,
    );
});
