import assert from "node:assert/strict";
import test from "node:test";

import { estimateProgressLabel } from "../dist/renderer/calendar/estimates.js";

/**
 * Converts Date fixture to `YYYY-MM-DD` day key.
 * @param {Date} date Date fixture.
 * @returns {string} Day key text.
 */
function dayKey(date) {
    const YEAR = date.getFullYear();
    const MONTH = String(date.getMonth() + 1).padStart(2, "0");
    const DAY = String(date.getDate()).padStart(2, "0");
    return `${YEAR}-${MONTH}-${DAY}`;
}

/**
 * Offsets a day key by N days.
 * @param {string} key Base day key.
 * @param {number} delta Day offset.
 * @returns {string} Shifted day key.
 */
function plusDays(key, delta) {
    const DATE = new Date(`${key}T00:00:00`);
    DATE.setDate(DATE.getDate() + delta);
    return dayKey(DATE);
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
    const TODAY = dayKey(new Date());
    const TOMORROW = plusDays(TODAY, 1);
    const TODAY_ROW = row({ date: TODAY, session_index: 1 });
    const FUTURE_ROW = row({ date: TOMORROW, session_index: 1 });
    const STATE = {
        rows: [TODAY_ROW, FUTURE_ROW],
        totalsByBookId: { "book-1": 4000 },
    };

    const LABEL = estimateProgressLabel(
        FUTURE_ROW,
        STATE,
        () => book(),
        () => false,
    );

    assert.equal(
        LABEL,
        "Estimated by end of this session: 300 pages read (75% complete)",
    );
});

test("estimateProgressLabel ignores completed current-day sessions for future estimates", () => {
    const TODAY = dayKey(new Date());
    const TOMORROW = plusDays(TODAY, 1);
    const TODAY_ROW = row({ date: TODAY, session_index: 1 });
    const FUTURE_ROW = row({ date: TOMORROW, session_index: 1 });
    const STATE = {
        rows: [TODAY_ROW, FUTURE_ROW],
        totalsByBookId: { "book-1": 4000 },
    };

    const LABEL = estimateProgressLabel(
        FUTURE_ROW,
        STATE,
        () => book(),
        (sessionKey) => sessionKey === `${TODAY}|1|book-1`,
    );

    assert.equal(
        LABEL,
        "Estimated by end of this session: 200 pages read (50% complete)",
    );
});

test("estimateProgressLabel ignores completed pre-target sessions even when date is after local today", () => {
    const TODAY = dayKey(new Date());
    const SHIFTED_CURRENT = plusDays(TODAY, 1);
    const TARGET = plusDays(TODAY, 2);
    const SHIFTED_CURRENT_ROW = row({
        date: SHIFTED_CURRENT,
        session_index: 1,
    });
    const TARGET_ROW = row({ date: TARGET, session_index: 1 });
    const STATE = {
        rows: [SHIFTED_CURRENT_ROW, TARGET_ROW],
        totalsByBookId: { "book-1": 4000 },
    };

    const LABEL = estimateProgressLabel(
        TARGET_ROW,
        STATE,
        () => book(),
        (sessionKey) => sessionKey === `${SHIFTED_CURRENT}|1|book-1`,
    );

    assert.equal(
        LABEL,
        "Estimated by end of this session: 200 pages read (50% complete)",
    );
});

test("estimateProgressLabel uses current progress for completed current-day session", () => {
    const TODAY = dayKey(new Date());
    const TODAY_ROW = row({ date: TODAY, session_index: 1 });
    const STATE = {
        rows: [TODAY_ROW],
        totalsByBookId: { "book-1": 4000 },
    };

    const LABEL = estimateProgressLabel(
        TODAY_ROW,
        STATE,
        () => book({ progress_percent: 40 }),
        (sessionKey) => sessionKey === `${TODAY}|1|book-1`,
    );

    assert.equal(
        LABEL,
        "Estimated by end of this session: 160 pages read (40% complete)",
    );
});

test("estimateProgressLabel projects end-of-session pages for incomplete current-day session", () => {
    const TODAY = dayKey(new Date());
    const TODAY_ROW = row({ date: TODAY, session_index: 1 });
    const STATE = {
        rows: [TODAY_ROW],
        totalsByBookId: { "book-1": 4000 },
    };

    const LABEL = estimateProgressLabel(
        TODAY_ROW,
        STATE,
        () => book(),
        () => false,
    );

    assert.equal(
        LABEL,
        "Estimated by end of this session: 200 pages read (50% complete)",
    );
});
