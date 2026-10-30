// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers atomic completed-session logging during sync imports and retries. */
import assert from "node:assert/strict";
import test from "node:test";
import { dayMinutesFromActivity } from "../dist/renderer/activity/day-minutes.js";
import { todayDayKey } from "../dist/renderer/app/date_keys.js";
import { createRuntimeState } from "../dist/renderer/app/runtime_state.js";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import {
    dayBookCompletionKey,
    sessionKeyFor,
} from "../dist/renderer/calendar/utils.js";
import { applySyncImport } from "../dist/renderer/sync/import.js";
import { stageSyncSessions } from "../dist/renderer/sync/sessions.js";

const RECORD = {
    dateLastRead: "2026-02-01T12:00:00Z",
    percentRead: 60,
    provider: "kobo",
    sourceId: "book",
    title: "Book",
};
const CHOICE = { bookId: "book", record: RECORD, sessionMinutes: 25 };
const SETTINGS = { wpm_base: 200 };

/** Captures the durable snapshot that would be written by the host. */
async function saveFixture(state) {
    const STATE = state;
    if (STATE.saveOk) {
        STATE.durable = structuredClone({
            books: STATE.books,
            runtime: STATE.runtime,
        });
    }
    return await Promise.resolve(STATE.saveOk);
}

function fixture() {
    const STATE = {
        books: [normalizeBook({ book_id: "book", title: "Book" })],
        durable: null,
        runtime: createRuntimeState(),
        saveOk: true,
    };
    const STORE = {
        changed: () => {
            // Rendering is outside the persistence fixture.
        },
        flush: async () => await Promise.resolve(true),
        getBooks: () => STATE.books,
        replaceBooks: (books) => {
            STATE.books = books;
        },
        save: async () => await saveFixture(STATE),
        stageSessions: (choices) =>
            stageSyncSessions(STATE.runtime, {
                books: STATE.books,
                choices,
                settings: SETTINGS,
            }),
    };
    return { state: STATE, store: STORE };
}

test("opted-in minutes are completed today in the same snapshot as progress", async () => {
    const { state: STATE, store: STORE } = fixture();
    await applySyncImport(STORE, [CHOICE]);
    const ROW = STATE.durable.runtime.lastResult.schedule[0];
    assert.equal(ROW.date, todayDayKey());
    assert.equal(ROW.minutes, CHOICE.sessionMinutes);
    assert.equal(ROW.book_id, CHOICE.bookId);
    assert.equal(
        STATE.durable.runtime.scheduleCompletions[sessionKeyFor(ROW)],
        true,
    );
    assert.equal(STATE.durable.books[0].progress_percent, RECORD.percentRead);
    assert.deepEqual(STATE.durable.books[0].sync_links, [RECORD]);
    const MINUTES = dayMinutesFromActivity({ ...STATE.runtime, year: null });
    assert.equal(MINUTES.get(todayDayKey()), CHOICE.sessionMinutes);
});

test("progress-only imports do not create sessions", async () => {
    const { state: STATE, store: STORE } = fixture();
    await applySyncImport(STORE, [{ bookId: CHOICE.bookId, record: RECORD }]);
    assert.equal(STATE.runtime.lastResult, null);
    assert.deepEqual(STATE.runtime.scheduleCompletions, {});
});

test("a failed save rolls back time, completion flags, blocks, and progress before retry", async () => {
    const { state: STATE, store: STORE } = fixture();
    const KEY = dayBookCompletionKey(todayDayKey(), CHOICE.bookId);
    STATE.runtime.blockedDayBooks[KEY] = true;
    STATE.saveOk = false;
    await assert.rejects(applySyncImport(STORE, [CHOICE]), /restored/);
    assert.equal(STATE.runtime.lastResult, null);
    assert.deepEqual(STATE.runtime.scheduleCompletions, {});
    assert.equal(STATE.runtime.blockedDayBooks[KEY], true);
    assert.equal(STATE.books[0].progress_percent, 0);
    STATE.saveOk = true;
    await applySyncImport(STORE, [CHOICE]);
    assert.equal(STATE.runtime.lastResult.schedule.length, 1);
    assert.equal(STATE.runtime.blockedDayBooks[KEY], undefined);
});

test("repeated source records cannot log duplicate sessions", async () => {
    const { state: STATE, store: STORE } = fixture();
    await applySyncImport(STORE, [CHOICE]);
    await applySyncImport(STORE, [CHOICE]);
    assert.equal(STATE.runtime.lastResult.schedule.length, 1);
});

test("stale and missing targets never add sessions", async () => {
    const { state: STATE, store: STORE } = fixture();
    STATE.books[0] = {
        ...STATE.books[0],
        progress_percent: 80,
        progress_updated_at: "2026-02-02T12:00:00Z",
    };
    const RESULT = await applySyncImport(STORE, [
        CHOICE,
        {
            ...CHOICE,
            bookId: "missing",
            record: { ...RECORD, sourceId: "missing" },
        },
    ]);
    assert.equal(RESULT.imported, 0);
    assert.equal(STATE.runtime.lastResult, null);
});

for (const MINUTES of [0, -1, 1.5, NaN, Infinity, 1441]) {
    test(`invalid minutes ${MINUTES} cannot persist progress or time`, async () => {
        const { state: STATE, store: STORE } = fixture();
        await assert.rejects(
            applySyncImport(STORE, [{ ...CHOICE, sessionMinutes: MINUTES }]),
            /restored/,
        );
        assert.equal(STATE.books[0].progress_percent, 0);
        assert.equal(STATE.runtime.lastResult, null);
        assert.equal(STATE.durable, null);
    });
}

test("existing and new sessions keep distinct identities on the same day", async () => {
    const { state: STATE, store: STORE } = fixture();
    const EXISTING = existingRow();
    STATE.runtime.lastResult = {
        created_at: "",
        schedule: [EXISTING],
        summary: null,
    };
    await applySyncImport(STORE, [CHOICE]);
    assert.equal(STATE.runtime.lastResult.schedule[0], EXISTING);
    const ADDED = STATE.runtime.lastResult.schedule[1];
    assert.equal(ADDED.session_index, 5);
    assert.equal(
        STATE.runtime.scheduleCompletions[sessionKeyFor(EXISTING)],
        undefined,
    );
    assert.equal(STATE.runtime.scheduleCompletions[sessionKeyFor(ADDED)], true);
});

/** Existing planned work must retain its identity and completion state. */
function existingRow() {
    return {
        book_id: "book",
        date: todayDayKey(),
        minutes: 10,
        session_index: 4,
        title: "Book",
        words_planned: 1000,
    };
}
