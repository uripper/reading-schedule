// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers session rollback alongside concurrent calendar activity and multi-book imports. */
import assert from "node:assert/strict";
import test from "node:test";
import { todayDayKey } from "../dist/renderer/app/date_keys.js";
import { createRuntimeState } from "../dist/renderer/app/runtime_state.js";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import {
    dayBookCompletionKey,
    sessionKeyFor,
} from "../dist/renderer/calendar/utils.js";
import { stageSyncSessions } from "../dist/renderer/sync/sessions.js";

const BOOKS = [
    normalizeBook({ book_id: "one", title: "One" }),
    normalizeBook({ book_id: "two", title: "Two" }),
];
const RECORD = {
    dateLastRead: "2026-02-01T12:00:00Z",
    percentRead: 60,
    provider: "kobo",
    sourceId: "one",
    title: "One",
};
const CHOICE = { bookId: "one", record: RECORD, sessionMinutes: 25 };
const INPUT = { books: BOOKS, choices: [CHOICE], settings: { wpm_base: 200 } };

/** Models a second completed session entered while an import save is pending. */
function concurrentFixture() {
    const STATE = createRuntimeState();
    const ROLLBACK = stageSyncSessions(STATE, INPUT);
    const ADDED = STATE.lastResult.schedule[0];
    const CONCURRENT = {
        ...ADDED,
        minutes: 15,
        session_index: ADDED.session_index + 1,
    };
    STATE.lastResult = {
        ...STATE.lastResult,
        schedule: [...STATE.lastResult.schedule, CONCURRENT],
    };
    STATE.scheduleCompletions[sessionKeyFor(CONCURRENT)] = true;
    STATE.blockedDayBooks.unrelated = true;
    return {
        added: ADDED,
        concurrent: CONCURRENT,
        rollback: ROLLBACK,
        state: STATE,
    };
}

test("rollback preserves completed reading added while the save was in flight", () => {
    const {
        state: STATE,
        rollback: ROLLBACK,
        added: ADDED,
        concurrent: CONCURRENT,
    } = concurrentFixture();
    ROLLBACK();
    assert.deepEqual(STATE.lastResult.schedule, [CONCURRENT]);
    assert.equal(STATE.scheduleCompletions[sessionKeyFor(ADDED)], undefined);
    assert.equal(STATE.scheduleCompletions[sessionKeyFor(CONCURRENT)], true);
    assert.equal(
        STATE.scheduleCompletions[dayBookCompletionKey(todayDayKey(), "one")],
        true,
    );
    assert.equal(STATE.blockedDayBooks.unrelated, true);
    assert.equal(
        STATE.derived.completionBySessionKey[sessionKeyFor(ADDED)],
        undefined,
    );
});

test("multiple books get separate completed sessions with their own entered durations", () => {
    const STATE = createRuntimeState();
    stageSyncSessions(STATE, {
        ...INPUT,
        choices: [CHOICE, { ...CHOICE, bookId: "two", sessionMinutes: 40 }],
    });
    const ROWS = STATE.lastResult.schedule;
    assert.deepEqual(
        ROWS.map((row) => row.book_id),
        ["one", "two"],
    );
    assert.deepEqual(
        ROWS.map((row) => row.minutes),
        [25, 40],
    );
    assert.notEqual(sessionKeyFor(ROWS[0]), sessionKeyFor(ROWS[1]));
    assert.ok(
        ROWS.every((row) => STATE.scheduleCompletions[sessionKeyFor(row)]),
    );
});

test("invalid later choices cannot leave a partially staged schedule", () => {
    const STATE = createRuntimeState();
    assert.throws(() =>
        stageSyncSessions(STATE, {
            ...INPUT,
            choices: [CHOICE, { ...CHOICE, bookId: "two", sessionMinutes: 0 }],
        }),
    );
    assert.equal(STATE.lastResult, null);
    assert.deepEqual(STATE.scheduleCompletions, {});
});
