// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
/**
 * Verifies manual sessions are locked and keep one session per book per day.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { addManualSessionRow } from "../dist/renderer/app/calendar_interactions/calendar_interactions_schedule_updates.js";

const DATE = "2026-02-20";
const BOOK = { book_id: "book-1", difficulty: 3, title: "Manual Book" };

function noop() {
    return undefined;
}

function existingRow() {
    return {
        book_id: "book-1",
        date: DATE,
        minutes: 10,
        session_index: 2,
        title: "Manual Book",
        words_planned: 1000,
    };
}

function sessionBindings() {
    return {
        applyStateMutation: noop,
        onScheduleRowsUpdated: noop,
        queuePersist: noop,
        renderCalendar: noop,
        setBookScheduleRows: noop,
        setLastResult: noop,
        totalsFromSummary: () => ({}),
        updateBookProgress: () => null,
    };
}

function addSession(schedule) {
    const STATE = {
        blockedDayBooks: {},
        lastResult: { schedule, summary: null },
        scheduleCompletions: {},
    };
    const STATUS_MESSAGES = [];
    const ADDED = addManualSessionRow({
        ...sessionBindings(),
        bookId: BOOK.book_id,
        collectSettings: () => ({
            difficulty_multiplier: { 3: 1 },
            wpm_base: 100,
        }),
        date: DATE,
        getBookById: () => BOOK,
        minutes: 15,
        setStatus(message) {
            STATUS_MESSAGES.push(message);
        },
        state: STATE,
    });
    return { added: ADDED, state: STATE, statusMessages: STATUS_MESSAGES };
}

test("manual sessions are locked to their day", () => {
    const RESULT = addSession([]);
    assert.equal(RESULT.added, true);
    assert.equal(RESULT.state.lastResult.schedule.length, 1);
    assert.equal(RESULT.state.lastResult.schedule[0].locked, true);
});

test("adding a book already on that day grows its existing session", () => {
    const RESULT = addSession([existingRow()]);
    const ROWS = RESULT.state.lastResult.schedule;

    assert.equal(ROWS.length, 1);
    assert.equal(ROWS[0].session_index, 2);
    assert.equal(ROWS[0].minutes, 25);
    assert.equal(ROWS[0].words_planned, 2500);
    assert.equal(ROWS[0].locked, true);
    assert.match(RESULT.statusMessages[0], /Added 15 minutes to "Manual Book"/);
});
