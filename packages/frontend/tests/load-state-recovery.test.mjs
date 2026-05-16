// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
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
    socialEnabled: true,
};

function createNoopHooks() {
    const NOOP = () => undefined;
    return {
        applyLoadedResult: NOOP,
        applyPreferencesToDocument: NOOP,
        fillBooks: NOOP,
        fillPreferencesUI: NOOP,
        fillSettings: NOOP,
        onLoaded: NOOP,
        setBlockedDayBooks: NOOP,
        setFeatureFlags: NOOP,
        setPreferences: NOOP,
        setScheduleCompletions: NOOP,
        setSessions: NOOP,
        updateTodayView: NOOP,
    };
}

function plannerApiFor(loadResult) {
    return {
        loadState: () => Promise.resolve(loadResult),
        sample: () =>
            Promise.resolve({
                books: [],
                settings: { start_date: "2026-04-01" },
            }),
    };
}

/**
 * Builds load-state args with capture arrays for status/log assertions.
 * @param options - Load fixture inputs and override hooks.
 * @returns Load arguments.
 */
function loadArgs(options) {
    const { loadResult, logs, overrides = {}, statuses } = options;
    const BASE = {
        addLog: (message) => {
            logs.push(message);
        },
        ...createNoopHooks(),
        normalizeFeatureFlags: () => DEFAULT_FEATURE_FLAGS,
        normalizePreferences: () => DEFAULT_PREFERENCES,
        normalizeScheduleCompletions: (value) => value,
        plannerApi: plannerApiFor(loadResult),
        setStatus: (message, isError = false) => {
            statuses.push({ isError, message });
        },
    };
    return { ...BASE, ...overrides };
}

function createLoadCapture() {
    return { logs: [], statuses: [] };
}

async function runLoad(capture, loadResult, overrides) {
    await loadInitialData(
        loadArgs({
            loadResult,
            logs: capture.logs,
            overrides,
            statuses: capture.statuses,
        }),
    );
}

function hasStatus(capture, text) {
    return capture.statuses.some((entry) => entry.message.includes(text));
}

function hasLog(capture, text) {
    return capture.logs.some((entry) => entry.includes(text));
}

test("loadInitialData surfaces backup/journal/fresh recovery warnings", async () => {
    const CAPTURE = createLoadCapture();

    await runLoad(CAPTURE, {
        source: "json_backup",
        state: { books: [], settings: { start_date: "2026-04-01" } },
        warningCode: "RECOVERED_FROM_BACKUP",
    });
    await runLoad(CAPTURE, {
        source: "sqlite_journal_replay",
        state: { books: [], settings: { start_date: "2026-04-02" } },
        warningCode: "RECOVERED_FROM_JOURNAL",
    });
    await runLoad(CAPTURE, {
        source: "fresh",
        state: null,
        warningCode: "STATE_RESET_FRESH",
    });

    assert.equal(hasStatus(CAPTURE, "backup copy"), true);
    assert.equal(hasStatus(CAPTURE, "journal replay"), true);
    assert.equal(hasStatus(CAPTURE, "Started with fresh data"), true);
    assert.equal(hasLog(CAPTURE, "Migrated saved data from JSON"), true);
});

test("loadInitialData logs migration info for json-primary loads", async () => {
    const CAPTURE = createLoadCapture();

    await runLoad(CAPTURE, {
        source: "json_primary",
        sourcePath: "/tmp/planner_state.json",
        state: { books: [], settings: { start_date: "2026-05-01" } },
        warningCode: "MIGRATED_JSON_TO_SQLITE",
    });

    assert.equal(CAPTURE.statuses.length, 0);
    assert.equal(hasLog(CAPTURE, "Migrated saved data from JSON"), true);
    assert.equal(hasLog(CAPTURE, "State load source: json_primary"), true);
    assert.equal(hasLog(CAPTURE, "/tmp/planner_state.json"), true);
});

test("loadInitialData logs native warning messages", async () => {
    const CAPTURE = createLoadCapture();

    await runLoad(CAPTURE, {
        source: "fresh",
        sourcePath: "C:/Users/example/AppData/Local/com.bartleby.app",
        state: null,
        warningMessage:
            "Checked legacy state directories: C:/Users/example/AppData/Roaming/Bartleby",
    });

    assert.equal(hasLog(CAPTURE, "State load source: fresh"), true);
    assert.equal(hasLog(CAPTURE, "Roaming/Bartleby"), true);
});
