import assert from "node:assert/strict";
import test from "node:test";

import { estimateProgressLabel } from "../dist/renderer/calendar/estimates.js";

/**
 * Converts Date fixture to `YYYY-MM-DD` day key.
 * @param {Date} date Date fixture.
 * @returns {string} Day key text.
 */
function dayKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Offsets a day key by N days.
 * @param {string} key Base day key.
 * @param {number} delta Day offset.
 * @returns {string} Shifted day key.
 */
function plusDays(key, delta) {
    const date = new Date(`${key}T00:00:00`);
    date.setDate(date.getDate() + delta);
    return dayKey(date);
}

/**
 * Builds calendar row fixture with override support.
 * @param {Record<string, unknown>} overrides Row field overrides.
 * @returns {Record<string, unknown>} Row fixture.
 */
function row(overrides) {
    return {
        book_id: "book-1",
        date: "",
        session_index: 1,
        words_planned: 1000,
        ...overrides,
    };
}

/**
 * Builds in-progress book fixture with override support.
 * @param {Record<string, unknown>} overrides Book field overrides.
 * @returns {Record<string, unknown>} Book fixture.
 */
function book(overrides = {}) {
    return {
        author: "Author",
        blocked_by: null,
        book_id: "book-1",
        cover_local_path: "",
        cover_url: "",
        deadline: null,
        difficulty: 3,
        finished_at: null,
        lookup_note: "",
        max_minutes_per_day: null,
        min_blocks_per_session: 1,
        pages_read: null,
        pages_total: 400,
        priority: 3,
        progress_percent: 25,
        shelf: "",
        status: "in_progress",
        title: "Book",
        words_total: 4000,
        ...overrides,
    };
}

test("estimateProgressLabel includes incomplete current-day sessions for future estimates", () => {
    const today = dayKey(new Date());
    const tomorrow = plusDays(today, 1);
    const todayRow = row({ date: today, session_index: 1 });
    const futureRow = row({ date: tomorrow, session_index: 1 });
    const state = {
        rows: [todayRow, futureRow],
        totalsByBookId: { "book-1": 4000 },
    };

    const label = estimateProgressLabel(
        futureRow,
        state,
        () => book(),
        () => false,
    );

    assert.equal(
        label,
        "Estimated by end of this session: 300 pages read (75% complete)",
    );
});

test("estimateProgressLabel ignores completed current-day sessions for future estimates", () => {
    const today = dayKey(new Date());
    const tomorrow = plusDays(today, 1);
    const todayRow = row({ date: today, session_index: 1 });
    const futureRow = row({ date: tomorrow, session_index: 1 });
    const state = {
        rows: [todayRow, futureRow],
        totalsByBookId: { "book-1": 4000 },
    };

    const label = estimateProgressLabel(
        futureRow,
        state,
        () => book(),
        (sessionKey) => sessionKey === `${today}|1|book-1`,
    );

    assert.equal(
        label,
        "Estimated by end of this session: 200 pages read (50% complete)",
    );
});

test("estimateProgressLabel ignores completed pre-target sessions even when date is after local today", () => {
    const today = dayKey(new Date());
    const shiftedCurrent = plusDays(today, 1);
    const target = plusDays(today, 2);
    const shiftedCurrentRow = row({ date: shiftedCurrent, session_index: 1 });
    const targetRow = row({ date: target, session_index: 1 });
    const state = {
        rows: [shiftedCurrentRow, targetRow],
        totalsByBookId: { "book-1": 4000 },
    };

    const label = estimateProgressLabel(
        targetRow,
        state,
        () => book(),
        (sessionKey) => sessionKey === `${shiftedCurrent}|1|book-1`,
    );

    assert.equal(
        label,
        "Estimated by end of this session: 200 pages read (50% complete)",
    );
});

test("estimateProgressLabel uses current progress for completed current-day session", () => {
    const today = dayKey(new Date());
    const todayRow = row({ date: today, session_index: 1 });
    const state = {
        rows: [todayRow],
        totalsByBookId: { "book-1": 4000 },
    };

    const label = estimateProgressLabel(
        todayRow,
        state,
        () => book({ progress_percent: 40 }),
        (sessionKey) => sessionKey === `${today}|1|book-1`,
    );

    assert.equal(
        label,
        "Estimated by end of this session: 160 pages read (40% complete)",
    );
});

test("estimateProgressLabel projects end-of-session pages for incomplete current-day session", () => {
    const today = dayKey(new Date());
    const todayRow = row({ date: today, session_index: 1 });
    const state = {
        rows: [todayRow],
        totalsByBookId: { "book-1": 4000 },
    };

    const label = estimateProgressLabel(
        todayRow,
        state,
        () => book(),
        () => false,
    );

    assert.equal(
        label,
        "Estimated by end of this session: 200 pages read (50% complete)",
    );
});
