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
        id: `${bookId}-${endedAt}`,
        book_id: bookId,
        title: `Title ${bookId}`,
        started_at: endedAt,
        ended_at: endedAt,
        minutes: 25,
        pages_read: 10,
        notes: "",
        source: "manual",
        created_at: endedAt,
    };
}

test("App state mutations keep derived indexes synchronized", () => {
    const state = createRuntimeState();
    const books = [
        { book_id: "book-1", title: "One" },
        { book_id: "book-2", title: "Two" },
    ];

    applyAppStateMutation(state, { type: "set_book_index", books });
    assert.equal(state.derived.bookById.get("book-1")?.title, "One");

    const sessions = [
        session("book-1", "2026-02-27T15:00:00.000Z"),
        session("book-2", "2026-02-27T16:00:00.000Z"),
        session("book-1", "2026-02-28T16:00:00.000Z"),
    ];
    applyAppStateMutation(state, { type: "set_sessions", sessions });

    const firstDayKey = isoLocalDayKey("2026-02-27T15:00:00.000Z");
    assert.equal(state.derived.sessionsByDay.get(firstDayKey)?.length, 2);
    assert.equal(state.derived.sessionsByBook.get("book-1")?.length, 2);

    const scheduleCompletions = {
        "2026-02-27|0|book-1": true,
        "2026-02-27|book-1": true,
    };
    applyAppStateMutation(state, {
        type: "set_schedule_completions",
        scheduleCompletions,
    });

    assert.equal(
        state.derived.completionBySessionKey["2026-02-27|0|book-1"],
        true,
    );
    assert.equal(
        state.derived.completionByDayBookKey["2026-02-27|book-1"],
        true,
    );

    applyAppStateMutation(state, {
        type: "set_blocked_day_book",
        key: "2026-02-27|book-1",
        blocked: true,
    });
    assert.equal(state.blockedDayBooks["2026-02-27|book-1"], true);

    applyAppStateMutation(state, {
        type: "set_blocked_day_book",
        key: "2026-02-27|book-1",
        blocked: false,
    });
    assert.equal(
        Object.hasOwn(state.blockedDayBooks, "2026-02-27|book-1"),
        false,
    );
});
