// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { localDayKeyFromIso } from "../dist/renderer/app/date_keys.js";
import { createRuntimeState } from "../dist/renderer/app/runtime_state.js";
import { applyAppStateMutation } from "../dist/renderer/app/state_mutations.js";

/**
 * Creates a minimal valid session fixture.
 * @param bookId - Book id for fixture session.
 * @param endedAt - End timestamp used for day indexing.
 * @returns Session fixture payload.
 */
function session(bookId, endedAt) {
    return {
        book_id: bookId,
        created_at: endedAt,
        ended_at: endedAt,
        id: `${bookId}-${endedAt}`,
        minutes: 25,
        notes: "",
        pages_read: 10,
        source: "manual",
        started_at: endedAt,
        title: `Title ${bookId}`,
    };
}

const BOOKS = [
    { book_id: "book-1", title: "One" },
    { book_id: "book-2", title: "Two" },
];
const SESSIONS = [
    session("book-1", "2026-02-27T15:00:00.000Z"),
    session("book-2", "2026-02-27T16:00:00.000Z"),
    session("book-1", "2026-02-28T16:00:00.000Z"),
];
const SCHEDULE_COMPLETIONS = {
    "2026-02-27|0|book-1": true,
    "2026-02-27|book-1": true,
};
const BLOCKED_DAY_BOOK_KEY = "2026-02-27|book-1";

function applyBooksAndSessions(state) {
    applyAppStateMutation(state, { books: BOOKS, type: "set_book_index" });
    applyAppStateMutation(state, { sessions: SESSIONS, type: "set_sessions" });
}

function applyCompletionIndexes(state) {
    applyAppStateMutation(state, {
        scheduleCompletions: SCHEDULE_COMPLETIONS,
        type: "set_schedule_completions",
    });
}

function assertSessionIndexes(state) {
    const FIRST_DAY_KEY = localDayKeyFromIso("2026-02-27T15:00:00.000Z");
    assert.equal(state.derived.sessionsByDay.get(FIRST_DAY_KEY)?.length, 2);
    assert.equal(state.derived.sessionsByBook.get("book-1")?.length, 2);
}

function assertCompletionIndexes(state) {
    assert.equal(
        state.derived.completionBySessionKey[BLOCKED_DAY_BOOK_KEY],
        true,
    );
    assert.equal(
        state.derived.completionByDayBookKey[BLOCKED_DAY_BOOK_KEY],
        true,
    );
}

function setBlockedDayBook(state, blocked) {
    applyAppStateMutation(state, {
        blocked,
        key: BLOCKED_DAY_BOOK_KEY,
        type: "set_blocked_day_book",
    });
}

test("App state mutations keep derived indexes synchronized", () => {
    const STATE = createRuntimeState();
    const STATE_REFERENCE = STATE;
    applyBooksAndSessions(STATE);
    assert.strictEqual(STATE, STATE_REFERENCE);
    assert.equal(STATE.derived.bookById.get("book-1")?.title, "One");
    assertSessionIndexes(STATE);
    applyCompletionIndexes(STATE);
    assertCompletionIndexes(STATE);
    setBlockedDayBook(STATE, true);
    assert.equal(STATE.blockedDayBooks[BLOCKED_DAY_BOOK_KEY], true);
    setBlockedDayBook(STATE, false);
    assert.equal(
        Object.hasOwn(STATE.blockedDayBooks, BLOCKED_DAY_BOOK_KEY),
        false,
    );
});
