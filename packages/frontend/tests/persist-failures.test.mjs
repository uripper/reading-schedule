// biome-ignore-all lint/correctness/noUnresolvedImports: tests exercise built frontend artifacts.
/** Covers failed saves, snapshot collection, and recovery through the real queue. */
import assert from "node:assert/strict";
import test from "node:test";
import { createPersistQueue } from "../dist/renderer/app/persist-queue.js";
import { baseQueueArgs } from "./helpers/persistence.mjs";

test("rejected and thrown saves report failure and allow a later successful save", async () => {
    const RESULTS = [];
    const LOGS = [];
    const OUTCOMES = [
        () => Promise.resolve({ error: "Disk full", ok: false }),
        () => Promise.reject(new Error("Disconnected disk")),
        () => Promise.resolve({ ok: true }),
    ];
    const QUEUE = createPersistQueue({
        ...baseQueueArgs(() => OUTCOMES.shift()()),
        addLog: (message) => LOGS.push(message),
        onPersistResult: (saved) => RESULTS.push(saved),
    });
    assert.equal(await QUEUE.persistDraft(), false);
    assert.equal(await QUEUE.persistDraft(), false);
    assert.equal(await QUEUE.flushPendingState(), true);
    assert.deepEqual(RESULTS, [false, false, true]);
    assert.match(LOGS[0], /Disk full/u);
    assert.match(LOGS[1], /unexpected state persistence error/u);
});

test("a collection failure does not poison overlapping saves", async () => {
    const RESULTS = [];
    const SNAPSHOTS = [];
    let shouldFail = true;
    const QUEUE = createPersistQueue({
        ...baseQueueArgs((payload) => {
            SNAPSHOTS.push(payload);
            return Promise.resolve({ ok: true });
        }),
        collectBooks: () => {
            if (shouldFail) {
                shouldFail = false;
                throw new Error("Invalid book state");
            }
            return [{ book_id: "latest-book", title: "Latest book" }];
        },
        onPersistResult: (saved) => RESULTS.push(saved),
    });
    assert.deepEqual(
        await Promise.all([QUEUE.persistDraft(), QUEUE.persistDraft()]),
        [false, true],
    );
    assert.deepEqual(RESULTS, [false, true]);
    assert.equal(SNAPSHOTS[0].books[0].book_id, "latest-book");
});

test("retrying persists the latest edited state after a failed snapshot", async () => {
    const SNAPSHOTS = [];
    let title = "Before failure";
    const QUEUE = createPersistQueue({
        ...baseQueueArgs((payload) => {
            SNAPSHOTS.push(payload);
            return Promise.resolve({ ok: SNAPSHOTS.length > 1 });
        }),
        collectBooks: () => [{ book_id: "book-1", title }],
    });
    assert.equal(await QUEUE.persistDraft(), false);
    title = "Edited while unsaved";
    assert.equal(await QUEUE.flushPendingState(), true);
    assert.equal(SNAPSHOTS[1].books[0].title, title);
});

test("a debounced autosave failure reports to the same recovery callback", async () => {
    let reportResult;
    const REPORTED = new Promise((resolve) => {
        reportResult = resolve;
    });
    const QUEUE = createPersistQueue({
        ...baseQueueArgs(() => Promise.resolve({ ok: false })),
        onPersistResult: reportResult,
    });
    QUEUE.queuePersist();
    assert.equal(await REPORTED, false);
});
