import assert from "node:assert/strict";
import test from "node:test";

const { createPlanController } =
    await import("../dist/renderer/app/plan_controller.js");

const EMPTY_RESULT = { schedule: [], summary: null };

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

function controllerArgs(generate, applied) {
    return {
        addLog: () => undefined,
        announce: () => undefined,
        collectBooks: () => [{ book_id: "book-1", title: "Book 1" }],
        collectSettings: () => ({
            end_date: "2026-06-01",
            start_date: "2026-05-21",
        }),
        getBlockedDayBooks: () => ({}),
        getLastResult: () => null,
        getScheduleCompletions: () => ({}),
        getSessions: () => [],
        persistDraft: () => Promise.resolve(true),
        plannerApi: { generate },
        renderCalendar: () => undefined,
        setBookScheduleRows: () => undefined,
        setLastResult: (result) => applied.push(result),
        setScheduleCompletions: () => undefined,
        setStatus: () => undefined,
        totalsFromSummary: () => ({}),
        updateTodayView: () => undefined,
    };
}

function installTimers() {
    const ORIGINAL_SET = globalThis.setTimeout;
    const ORIGINAL_CLEAR = globalThis.clearTimeout;
    const TIMERS = new Map();
    let nextId = 0;
    globalThis.setTimeout = (callback) => {
        nextId += 1;
        TIMERS.set(nextId, callback);
        return nextId;
    };
    globalThis.clearTimeout = (id) => {
        TIMERS.delete(id);
    };
    return {
        fireAll() {
            const CALLBACKS = [...TIMERS.values()];
            TIMERS.clear();
            for (const CALLBACK of CALLBACKS) {
                CALLBACK();
            }
        },
        restore() {
            globalThis.setTimeout = ORIGINAL_SET;
            globalThis.clearTimeout = ORIGINAL_CLEAR;
        },
        size: () => TIMERS.size,
    };
}

test("invalidating cancels a queued run before it starts", async () => {
    const TIMERS = installTimers();
    let generated = 0;
    try {
        const CONTROLLER = createPlanController(
            controllerArgs(() => {
                generated += 1;
                return Promise.resolve(EMPTY_RESULT);
            }, []),
        );
        CONTROLLER.queueAutoPlan();
        CONTROLLER.invalidatePendingRuns();
        assert.equal(TIMERS.size(), 0);
        TIMERS.fireAll();
        await flushAsync();
    } finally {
        TIMERS.restore();
    }
    assert.equal(generated, 0);
});

test("a plan generated for the previous workspace is never applied", async () => {
    const TIMERS = installTimers();
    const APPLIED = [];
    const PENDING = deferred();
    try {
        const CONTROLLER = createPlanController(
            controllerArgs(async () => await PENDING.promise, APPLIED),
        );
        CONTROLLER.queueAutoPlan();
        TIMERS.fireAll();
        await flushAsync();
        CONTROLLER.invalidatePendingRuns();
        PENDING.resolve(EMPTY_RESULT);
        await flushAsync();
    } finally {
        TIMERS.restore();
    }
    assert.equal(APPLIED.length, 0);
});
