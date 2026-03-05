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
 * Builds load-state args with override hooks for legacy-shape assertions.
 * @param {import("../dist/types/types.js").PlannerStateLoadResult} loadResult - Structured load result fixture.
 * @param {Partial<import("../dist/types/types_app.js").LoadStateArgs>} overrides - Override hooks for targeted assertions.
 * @returns {import("../dist/types/types_app.js").LoadStateArgs} Load arguments.
 */
function loadArgs(loadResult, overrides = {}) {
    const NOOP = () => undefined;
    const BASE = {
        addLog: NOOP,
        applyLoadedResult: NOOP,
        applyPreferencesToDocument: NOOP,
        fillBooks: NOOP,
        fillPreferencesUI: NOOP,
        fillSettings: NOOP,
        normalizeFeatureFlags: (value) => ({
            ...DEFAULT_FEATURE_FLAGS,
            ...value,
        }),
        normalizePreferences: () => DEFAULT_PREFERENCES,
        normalizeScheduleCompletions: (value) => value,
        onLoaded: NOOP,
        plannerApi: {
            loadState: () => Promise.resolve(loadResult),
            sample: () =>
                Promise.resolve({
                    books: [],
                    settings: { start_date: "2026-04-01" },
                }),
        },
        setBlockedDayBooks: NOOP,
        setFeatureFlags: NOOP,
        setPreferences: NOOP,
        setScheduleCompletions: NOOP,
        setSessions: NOOP,
        setStatus: NOOP,
        updateTodayView: NOOP,
    };
    return { ...BASE, ...overrides };
}

test("loadInitialData restores legacy session/completion/result shapes", async () => {
    let capturedSessions = [];
    let capturedCompletions = {};
    let capturedBlocked = {};
    let capturedResult = null;
    let capturedFeatureFlags = null;
    const LOGS = [];

    await loadInitialData(
        loadArgs(
            {
                source: "json_primary",
                sourcePath:
                    "C:/Users/example/AppData/Roaming/reading-plan-gui/planner_state.json",
                state: {
                    blockedDayBooks: {
                        "2026-05-01|book-1": 1,
                    },
                    books: [],
                    featureFlags: {
                        gamificationEnabled: false,
                    },
                    lastResult: {
                        created_at: "2026-05-01T12:00:00.000Z",
                        schedule: [
                            {
                                book_id: "book-1",
                                date: "2026-05-01",
                                minutes: 12,
                                session_index: 0,
                                title: "Legacy Session",
                                words_planned: 100,
                            },
                        ],
                        summary: null,
                    },
                    scheduleCompletions: {
                        "2026-05-01|0|book-1": true,
                    },
                    session_history: {
                        first: {
                            book_id: "book-1",
                            endedAt: "2026-05-01T10:12:00.000Z",
                            minutes: 12,
                            source: "manual",
                            startedAt: "2026-05-01T10:00:00.000Z",
                            title: "Legacy Session",
                        },
                    },
                    settings: { start_date: "2026-05-01" },
                },
                warningCode: "MIGRATED_JSON_TO_SQLITE",
            },
            {
                addLog: (message) => {
                    LOGS.push(message);
                },
                applyLoadedResult: (result) => {
                    capturedResult = result;
                },
                setBlockedDayBooks: (blocked) => {
                    capturedBlocked = blocked;
                },
                setFeatureFlags: (flags) => {
                    capturedFeatureFlags = flags;
                },
                setScheduleCompletions: (completions) => {
                    capturedCompletions = completions;
                },
                setSessions: (sessions) => {
                    capturedSessions = sessions;
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
        LOGS.some((entry) => entry.includes("State load source: json_primary")),
        true,
    );
});
