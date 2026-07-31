// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { createPersistQueue } from "../dist/renderer/app/persist-queue.js";

const QUEUED_SAVE_WAIT_MS = 350;

function testFeatureFlags() {
    return {
        gamificationEnabled: true,
        socialEnabled: true,
    };
}

function testPreferences() {
    return {
        dailyGoalMinutes: 30,
        reduceMotion: false,
        reminderEnabled: false,
        reminderTime: "20:00",
        theme: "system",
        timezone: "UTC",
    };
}

function ignoreLog() {
    return undefined;
}

function baseQueueArgs(saveState) {
    return {
        addLog: ignoreLog,
        collectBooks: () => [],
        collectSettings: () => ({}),
        getSessions: () => [],
        plannerApi: { saveState },
        state: {
            blockedDayBooks: {},
            featureFlags: testFeatureFlags(),
            lastResult: null,
            preferences: testPreferences(),
            ready: true,
            scheduleCompletions: {},
        },
    };
}

function deferredSaveResult() {
    let resolveSave;
    const PROMISE = new Promise((resolve) => {
        resolveSave = resolve;
    });
    return {
        promise: PROMISE,
        resolveSave,
    };
}

test("prepareForStateImport cancels queued draft saves", async () => {
    let saves = 0;
    const QUEUE = createPersistQueue(
        baseQueueArgs(() => {
            saves += 1;
            return Promise.resolve({ ok: true });
        }),
    );

    QUEUE.queuePersist();
    await QUEUE.prepareForStateImport();
    await new Promise((resolve) => {
        setTimeout(resolve, QUEUED_SAVE_WAIT_MS);
    });

    assert.equal(saves, 0);
});

test("prepareForStateImport waits for active draft saves", async () => {
    const SAVE = deferredSaveResult();
    const QUEUE = createPersistQueue(baseQueueArgs(() => SAVE.promise));

    const SAVE_PROMISE = QUEUE.persistDraft();
    let prepared = false;
    const PREPARE_PROMISE = QUEUE.prepareForStateImport().then(() => {
        prepared = true;
    });
    await Promise.resolve();

    assert.equal(prepared, false);
    SAVE.resolveSave({ ok: true });
    await PREPARE_PROMISE;
    await SAVE_PROMISE;
    assert.equal(prepared, true);
});

test("persistDraft serializes overlapping saves", async () => {
    const FIRST_SAVE = deferredSaveResult();
    let saveCalls = 0;
    const QUEUE = createPersistQueue(
        baseQueueArgs(() => {
            saveCalls += 1;
            if (saveCalls === 1) {
                return FIRST_SAVE.promise;
            }
            return Promise.resolve({ ok: true });
        }),
    );

    const FIRST_PERSIST = QUEUE.persistDraft();
    const SECOND_PERSIST = QUEUE.persistDraft();
    await Promise.resolve();
    assert.equal(saveCalls, 1);

    FIRST_SAVE.resolveSave({ ok: true });
    await Promise.all([FIRST_PERSIST, SECOND_PERSIST]);
    assert.equal(saveCalls, 2);
});

test("flushPendingState replaces a queued save with one immediate snapshot", async () => {
    let saveCalls = 0;
    const QUEUE = createPersistQueue(
        baseQueueArgs(() => {
            saveCalls += 1;
            return Promise.resolve({ ok: true });
        }),
    );

    QUEUE.queuePersist();
    const SAVED = await QUEUE.flushPendingState();
    await new Promise((resolve) => {
        setTimeout(resolve, QUEUED_SAVE_WAIT_MS);
    });

    assert.equal(SAVED, true);
    assert.equal(saveCalls, 1);
});
