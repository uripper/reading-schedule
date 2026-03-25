// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { bindTodayDayRollover } from "../dist/renderer/app/today/today_rollover.js";

const NOOP = () => undefined;

function createFakeDocument() {
    const Listeners = new Map();
    return {
        addEventListener(type, listener) {
            Listeners.set(type, listener);
        },
        emit(type) {
            const LISTENER = Listeners.get(type);
            assert.equal(typeof LISTENER, "function");
            LISTENER();
        },
        removeEventListener(type, listener) {
            if (Listeners.get(type) === listener) {
                Listeners.delete(type);
            }
        },
        visibilityState: "hidden",
    };
}

test("bindTodayDayRollover refreshes when the scheduled midnight check sees a new day", () => {
    const DOCUMENT = createFakeDocument();
    let dayKey = "2026-03-11";
    let scheduledCallback = null;
    let refreshCalls = 0;

    const ROLLOVER = bindTodayDayRollover({
        clearTimeout: NOOP,
        document: DOCUMENT,
        now: () => new Date("2026-03-11T23:59:00"),
        onDayChanged: () => {
            refreshCalls += 1;
        },
        readDayKey: () => dayKey,
        setTimeout: (callback) => {
            scheduledCallback = callback;
            return 1;
        },
    });

    dayKey = "2026-03-12";
    assert.equal(typeof scheduledCallback, "function");
    scheduledCallback();

    assert.equal(refreshCalls, 1);
    ROLLOVER.dispose();
});

test("bindTodayDayRollover rechecks immediately when the window becomes visible", () => {
    const DOCUMENT = createFakeDocument();
    let dayKey = "2026-03-11";
    let refreshCalls = 0;

    const ROLLOVER = bindTodayDayRollover({
        clearTimeout: NOOP,
        document: DOCUMENT,
        now: () => new Date("2026-03-11T12:00:00"),
        onDayChanged: () => {
            refreshCalls += 1;
        },
        readDayKey: () => dayKey,
        setTimeout: () => 1,
    });

    dayKey = "2026-03-12";
    DOCUMENT.visibilityState = "visible";
    DOCUMENT.emit("visibilitychange");

    assert.equal(refreshCalls, 1);
    ROLLOVER.dispose();
});
