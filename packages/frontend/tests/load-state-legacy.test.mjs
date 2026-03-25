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
    recommendationsEnabled: true,
    socialEnabled: true,
};
const NOOP = () => undefined;

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

function defaultNormalizers() {
    return {
        normalizeFeatureFlags: (value) => ({
            ...DEFAULT_FEATURE_FLAGS,
            ...value,
        }),
        normalizePreferences: () => DEFAULT_PREFERENCES,
        normalizeScheduleCompletions: (value) => value,
    };
}

function defaultLoadArgs(loadResult) {
    return {
        addLog: NOOP,
        applyLoadedResult: NOOP,
        applyPreferencesToDocument: NOOP,
        fillBooks: NOOP,
        fillPreferencesUI: NOOP,
        fillSettings: NOOP,
        ...defaultNormalizers(),
        onLoaded: NOOP,
        plannerApi: plannerApiFor(loadResult),
        setBlockedDayBooks: NOOP,
        setFeatureFlags: NOOP,
        setPreferences: NOOP,
        setScheduleCompletions: NOOP,
        setSessions: NOOP,
        setStatus: NOOP,
        updateTodayView: NOOP,
    };
}

/**
 * Builds load-state args with override hooks for legacy-shape assertions.
 * @param {import("../dist/types/types.js").PlannerStateLoadResult} loadResult - Structured load result fixture.
 * @param {Partial<import("../dist/types/types_app.js").LoadStateArgs>} overrides - Override hooks for targeted assertions.
 * @returns {import("../dist/types/types_app.js").LoadStateArgs} Load arguments.
 */
function loadArgs(loadResult, overrides = {}) {
    return { ...defaultLoadArgs(loadResult), ...overrides };
}

function legacySessionHistory() {
    return {
        first: {
            book_id: "book-1",
            endedAt: "2026-05-01T10:12:00.000Z",
            minutes: 12,
            source: "manual",
            startedAt: "2026-05-01T10:00:00.000Z",
            title: "Legacy Session",
        },
    };
}

function legacyLastResult() {
    return {
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
    };
}

function legacyState() {
    return {
        blocked_day_books: {
            "2026-05-01|book-1": true,
        },
        books: [],
        featureFlags: {
            gamificationEnabled: false,
        },
        lastResult: legacyLastResult(),
        scheduleCompletions: {
            "2026-05-01|0|book-1": true,
        },
        session_history: legacySessionHistory(),
        settings: { start_date: "2026-05-01" },
    };
}

function legacyLoadResult() {
    return {
        source: "json_primary",
        sourcePath:
            "C:/Users/example/AppData/Roaming/reading-plan-gui/planner_state.json",
        state: legacyState(),
        warningCode: "MIGRATED_JSON_TO_SQLITE",
    };
}

function capturedState() {
    return {
        blocked: {},
        completions: {},
        featureFlags: null,
        result: null,
        sessions: [],
    };
}

function captureHookSet(captured, logs) {
    const CAPTURED = captured;
    return {
        addLog: (message) => {
            logs.push(message);
        },
        applyLoadedResult: (result) => {
            CAPTURED.result = result;
        },
        setBlockedDayBooks: (blocked) => {
            CAPTURED.blocked = blocked;
        },
        setFeatureFlags: (flags) => {
            CAPTURED.featureFlags = flags;
        },
        setScheduleCompletions: (completions) => {
            CAPTURED.completions = completions;
        },
        setSessions: (sessions) => {
            CAPTURED.sessions = sessions;
        },
    };
}

function createCaptureHooks(logs) {
    const CAPTURED = capturedState();
    return {
        captured: CAPTURED,
        hooks: captureHookSet(CAPTURED, logs),
    };
}

function assertLegacyLoadCaptured(capture, logs) {
    assert.equal(capture.sessions.length, 1);
    assert.equal(capture.sessions[0].book_id, "book-1");
    assert.equal(capture.sessions[0].source, "manual");
    assert.equal(capture.sessions[0].ended_at, "2026-05-01T10:12:00.000Z");
    assert.equal(capture.completions["2026-05-01|0|book-1"], true);
    assert.equal(capture.blocked["2026-05-01|book-1"], true);
    assert.equal(capture.result.schedule.length, 1);
    assert.equal(capture.featureFlags.gamificationEnabled, false);
    assert.equal(
        logs.some((entry) => entry.includes("State load source: json_primary")),
        true,
    );
}

test("loadInitialData restores legacy session/completion/result shapes", async () => {
    const LOGS = [];
    const CAPTURE = createCaptureHooks(LOGS);
    await loadInitialData(loadArgs(legacyLoadResult(), CAPTURE.hooks));
    assertLegacyLoadCaptured(CAPTURE.captured, LOGS);
});
