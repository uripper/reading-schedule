import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeState } from "../dist/renderer/app/runtime_state.js";
import { applyAppStateMutation } from "../dist/renderer/app/state_mutations.js";
import { isoLocalDayKey } from "../dist/renderer/sessions/utils.js";

/**
 * Creates a minimal valid session fixture.
 * @param {string} bookId Book id for fixture session.
 * @param {string} endedAt End timestamp used for day indexing.
 * @returns {Record<string, unknown>} Session fixture payload.
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

test("App state mutations keep derived indexes synchronized", () => {
    const STATE = createRuntimeState();
    const BOOKS = [
        { book_id: "book-1", title: "One" },
        { book_id: "book-2", title: "Two" },
    ];

    applyAppStateMutation(STATE, { books: BOOKS, type: "set_book_index" });
    assert.equal(STATE.derived.bookById.get("book-1")?.title, "One");

    const SESSIONS = [
        session("book-1", "2026-02-27T15:00:00.000Z"),
        session("book-2", "2026-02-27T16:00:00.000Z"),
        session("book-1", "2026-02-28T16:00:00.000Z"),
    ];
    applyAppStateMutation(STATE, { sessions: SESSIONS, type: "set_sessions" });

    const FIRST_DAY_KEY = isoLocalDayKey("2026-02-27T15:00:00.000Z");
    assert.equal(STATE.derived.sessionsByDay.get(FIRST_DAY_KEY)?.length, 2);
    assert.equal(STATE.derived.sessionsByBook.get("book-1")?.length, 2);

    const SCHEDULE_COMPLETIONS = {
        "2026-02-27|0|book-1": true,
        "2026-02-27|book-1": true,
    };
    applyAppStateMutation(STATE, {
        scheduleCompletions: SCHEDULE_COMPLETIONS,
        type: "set_schedule_completions",
    });

    assert.equal(
        STATE.derived.completionBySessionKey["2026-02-27|0|book-1"],
        true,
    );
    assert.equal(
        STATE.derived.completionByDayBookKey["2026-02-27|book-1"],
        true,
    );

    applyAppStateMutation(STATE, {
        blocked: true,
        key: "2026-02-27|book-1",
        type: "set_blocked_day_book",
    });
    assert.equal(STATE.blockedDayBooks["2026-02-27|book-1"], true);

    applyAppStateMutation(STATE, {
        blocked: false,
        key: "2026-02-27|book-1",
        type: "set_blocked_day_book",
    });
    assert.equal(
        Object.hasOwn(STATE.blockedDayBooks, "2026-02-27|book-1"),
        false,
    );
});
