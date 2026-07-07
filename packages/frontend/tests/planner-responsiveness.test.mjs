// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { installFakeDom } from "./helpers/fake-dom.mjs";

const { createPlanController } = await import(
    "../dist/renderer/app/plan_controller.js"
);
const { PLANNER_SUPERSEDED_MESSAGE } = await import(
    "../dist/renderer/app/plan-errors.js"
);
const { runPlanGeneration } = await import("../dist/renderer/app/plan.js");
const { createStatusSetter } = await import(
    "../dist/renderer/app/runtime_helpers.js"
);
const { createScheduleStatusOverlay } = await import(
    "../dist/renderer/app/schedule-status-overlay.js"
);

const BOOKS = [{ book_id: "book-1", title: "Book 1" }];
const SETTINGS = {
    end_date: "2026-06-01",
    start_date: "2026-05-21",
    wpm_base: 250,
};
const EMPTY_RESULT = { schedule: [], summary: null };
const INCOMPLETE_WARNING = "Planner could not schedule all remaining words.";
const INCOMPLETE_RESULT = {
    schedule: [],
    summary: {
        feasibility_warning: INCOMPLETE_WARNING,
        status: "INCOMPLETE",
    },
};

function deferred() {
    let resolve;
    const PROMISE = new Promise((resolvePromise) => {
        resolve = resolvePromise;
    });
    return { promise: PROMISE, resolve };
}

function flushAsync() {
    return new Promise((resolve) => {
        setImmediate(resolve);
    });
}

function installTimeoutHarness() {
    const ORIGINAL_SET_TIMEOUT = globalThis.setTimeout;
    const ORIGINAL_CLEAR_TIMEOUT = globalThis.clearTimeout;
    const Timers = [];
    const Cleared = [];
    globalThis.setTimeout = (callback, delay) => {
        const ID = Timers.length + 1;
        Timers.push({ callback, delay, id: ID });
        return ID;
    };
    globalThis.clearTimeout = (id) => {
        Cleared.push(id);
    };
    return {
        cleared: Cleared,
        restore() {
            globalThis.setTimeout = ORIGINAL_SET_TIMEOUT;
            globalThis.clearTimeout = ORIGINAL_CLEAR_TIMEOUT;
        },
        timers: Timers,
    };
}

function planArgs(overrides = {}) {
    return {
        addLog: () => undefined,
        announce: () => undefined,
        collectBooks: () => BOOKS,
        collectSettings: () => SETTINGS,
        onSuccess: () => Promise.resolve(),
        plannerApi: {
            generate: () => Promise.resolve(EMPTY_RESULT),
        },
        setStatus: () => undefined,
        successAnnouncement: "",
        ...overrides,
    };
}

test("runPlanGeneration ignores stale success results", async () => {
    let current = true;
    let applied = 0;
    const Statuses = [];
    await runPlanGeneration(
        planArgs({
            isRunCurrent: () => current,
            onSuccess: () => {
                applied += 1;
                return Promise.resolve();
            },
            plannerApi: {
                generate: () => {
                    current = false;
                    return Promise.resolve(EMPTY_RESULT);
                },
            },
            setStatus: (message, _isError, phase) => {
                Statuses.push({ message, phase });
            },
        }),
    );

    assert.equal(applied, 0);
    assert.deepEqual(Statuses, [
        { message: "Generating plan...", phase: "loading" },
    ]);
});

test("runPlanGeneration surfaces incomplete plans as errors", async () => {
    const Statuses = [];
    await runPlanGeneration(
        planArgs({
            plannerApi: {
                generate: () => Promise.resolve(INCOMPLETE_RESULT),
            },
            setStatus: (message, isError, phase) => {
                Statuses.push({ isError, message, phase });
            },
        }),
    );

    assert.deepEqual(Statuses, [
        {
            isError: false,
            message: "Generating plan...",
            phase: "loading",
        },
        {
            isError: true,
            message: INCOMPLETE_WARNING,
            phase: "error",
        },
    ]);
});

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Assertions stay with the async setup they verify.
test("runPlanGeneration ignores superseded planner errors", async () => {
    const Logs = [];
    const Statuses = [];
    await runPlanGeneration(
        planArgs({
            addLog: (message) => {
                Logs.push(message);
            },
            plannerApi: {
                generate: () =>
                    Promise.reject(new Error(PLANNER_SUPERSEDED_MESSAGE)),
            },
            setStatus: (message, isError, phase) => {
                Statuses.push({ isError, message, phase });
            },
        }),
    );

    assert.equal(
        Logs.some((message) => message.includes("error")),
        false,
    );
    assert.deepEqual(Statuses, [
        {
            isError: false,
            message: "Generating plan...",
            phase: "loading",
        },
    ]);
});

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: The request lifecycle is clearer as one flow.
test("auto plan starts a newer request while the previous one is still pending", async () => {
    const HARNESS = installTimeoutHarness();
    const DeferredCalls = [];
    const Applied = [];
    try {
        const CONTROLLER = createPlanController({
            addLog: () => undefined,
            announce: () => undefined,
            collectBooks: () => BOOKS,
            collectSettings: () => SETTINGS,
            getBlockedDayBooks: () => ({}),
            getLastResult: () => null,
            getScheduleCompletions: () => ({}),
            getSessions: () => [],
            persistDraft: async () => true,
            plannerApi: {
                generate: async () => {
                    const DEFERRED = deferred();
                    DeferredCalls.push(DEFERRED);
                    return await DEFERRED.promise;
                },
            },
            renderCalendar: () => undefined,
            setBookScheduleRows: () => undefined,
            setLastResult: (result) => {
                Applied.push(result);
            },
            setScheduleCompletions: () => undefined,
            setStatus: () => undefined,
            totalsFromSummary: () => ({}),
            updateTodayView: () => undefined,
        });

        CONTROLLER.queueAutoPlan();
        HARNESS.timers.shift().callback();
        await flushAsync();
        CONTROLLER.queueAutoPlan();
        HARNESS.timers.shift().callback();
        await flushAsync();

        assert.equal(DeferredCalls.length, 2);
        DeferredCalls[0].resolve(EMPTY_RESULT);
        await flushAsync();
        assert.equal(Applied.length, 0);
        DeferredCalls[1].resolve(EMPTY_RESULT);
        await flushAsync();
        assert.equal(Applied.length, 1);
    } finally {
        HARNESS.restore();
    }
});

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: DOM setup and assertions are intentionally adjacent.
test("schedule status overlay is nonblocking and keeps the live region separate", () => {
    const HARNESS = installFakeDom();
    const TIMEOUTS = installTimeoutHarness();
    try {
        const STATUS = HARNESS.createElement("output", "status");
        HARNESS.document.body.append(STATUS);
        const OVERLAY = createScheduleStatusOverlay(HARNESS.document);
        const SET_STATUS = createStatusSetter(STATUS, () => undefined, OVERLAY);

        SET_STATUS("Updating Schedule", false, "loading");
        const ROOT = HARNESS.document.getElementById("scheduleStatusOverlay");
        const TEXT = ROOT.querySelector(".schedule-status-overlay-text");
        assert.equal(STATUS.textContent, "Updating Schedule");
        assert.equal(ROOT.attributes.get("aria-hidden"), "true");
        assert.equal(ROOT.hidden, false);
        assert.equal(TEXT.textContent, "Updating Schedule");

        SET_STATUS("Schedule Updated", false, "success");
        assert.equal(TEXT.textContent, "Schedule Updated");
        assert.equal(TIMEOUTS.timers[0].delay, 3000);
        TIMEOUTS.timers[0].callback();
        assert.equal(ROOT.classList.contains("is-hiding"), true);
        TIMEOUTS.timers[1].callback();
        assert.equal(ROOT.hidden, true);

        const CSS = readFileSync(
            new URL("../styles/schedule-status-overlay.css", import.meta.url),
            "utf8",
        );
        assert.equal(CSS.includes("pointer-events: none"), true);
    } finally {
        TIMEOUTS.restore();
        HARNESS.restore();
    }
});
