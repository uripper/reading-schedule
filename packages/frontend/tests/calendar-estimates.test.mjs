// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { estimateProgressLabel } from "../dist/renderer/calendar/estimates.js";

const DEFAULT_BOOK = {
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
};

/**
 * Converts Date fixture to `YYYY-MM-DD` day key.
 * @param {Date} date - Date fixture.
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
 * @param {string} key - Base day key.
 * @param {number} delta - Day offset.
 * @returns {string} Shifted day key.
 */
function plusDays(key, delta) {
    const DATE = new Date(`${key}T00:00:00`);
    DATE.setDate(DATE.getDate() + delta);
    return dayKey(DATE);
}

/**
 * Builds calendar row fixture with override support.
 * @param {Record<string, unknown>} overrides - Row field overrides.
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
 * @param {Record<string, unknown>} overrides - Book field overrides.
 * @returns {Record<string, unknown>} Book fixture.
 */
function book(overrides = {}) {
    return { ...DEFAULT_BOOK, ...overrides };
}

function futureEstimateScenario() {
    const TODAY = dayKey(new Date());
    const TARGET = plusDays(TODAY, 1);
    const CURRENT_ROW = row({ date: TODAY, session_index: 1 });
    const TARGET_ROW = row({ date: TARGET, session_index: 1 });
    return {
        currentRow: CURRENT_ROW,
        state: {
            rows: [CURRENT_ROW, TARGET_ROW],
            totalsByBookId: { "book-1": 4000 },
        },
        targetRow: TARGET_ROW,
        today: TODAY,
    };
}

function shiftedFutureEstimateScenario() {
    const TODAY = dayKey(new Date());
    const SHIFTED_CURRENT = plusDays(TODAY, 1);
    const TARGET = plusDays(TODAY, 2);
    const CURRENT_ROW = row({ date: SHIFTED_CURRENT, session_index: 1 });
    const TARGET_ROW = row({ date: TARGET, session_index: 1 });
    return {
        shiftedCurrent: SHIFTED_CURRENT,
        state: {
            rows: [CURRENT_ROW, TARGET_ROW],
            totalsByBookId: { "book-1": 4000 },
        },
        targetRow: TARGET_ROW,
    };
}

test("estimateProgressLabel includes incomplete current-day sessions for future estimates", () => {
    const SCENARIO = futureEstimateScenario();

    const LABEL = estimateProgressLabel({
        getBookById: () => book(),
        isSessionCompleted: () => false,
        row: SCENARIO.targetRow,
        state: SCENARIO.state,
    });

    assert.equal(
        LABEL,
        "Estimated by end of this session: 300 pages read (75% complete)",
    );
});

test("estimateProgressLabel ignores completed current-day sessions for future estimates", () => {
    const SCENARIO = futureEstimateScenario();

    const LABEL = estimateProgressLabel({
        getBookById: () => book(),
        isSessionCompleted: (sessionKey) =>
            sessionKey === `${SCENARIO.today}|1|book-1`,
        row: SCENARIO.targetRow,
        state: SCENARIO.state,
    });

    assert.equal(
        LABEL,
        "Estimated by end of this session: 200 pages read (50% complete)",
    );
});

test("estimateProgressLabel ignores completed pre-target sessions even when date is after local today", () => {
    const SCENARIO = shiftedFutureEstimateScenario();

    const LABEL = estimateProgressLabel({
        getBookById: () => book(),
        isSessionCompleted: (sessionKey) =>
            sessionKey === `${SCENARIO.shiftedCurrent}|1|book-1`,
        row: SCENARIO.targetRow,
        state: SCENARIO.state,
    });

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

    const LABEL = estimateProgressLabel({
        getBookById: () => book({ progress_percent: 40 }),
        isSessionCompleted: (sessionKey) => sessionKey === `${TODAY}|1|book-1`,
        row: TODAY_ROW,
        state: STATE,
    });

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

    const LABEL = estimateProgressLabel({
        getBookById: () => book(),
        isSessionCompleted: () => false,
        row: TODAY_ROW,
        state: STATE,
    });

    assert.equal(
        LABEL,
        "Estimated by end of this session: 200 pages read (50% complete)",
    );
});

test("estimateProgressLabel prefers scheduler remaining words over live progress percent", () => {
    const TODAY = dayKey(new Date());
    const TARGET_ROW = row({
        date: plusDays(TODAY, 2),
        session_index: 1,
        words_planned: 250,
    });
    const STATE = {
        rows: [TARGET_ROW],
        totalsByBookId: { "book-1": 500 },
    };

    const LABEL = estimateProgressLabel({
        getBookById: () => book({ progress_percent: 10, words_total: 1000 }),
        isSessionCompleted: () => false,
        row: TARGET_ROW,
        state: STATE,
    });

    assert.equal(
        LABEL,
        "Estimated by end of this session: 300 pages read (75% complete)",
    );
});

test("estimateProgressLabel shows finish rows as 100 percent complete", () => {
    const TODAY = dayKey(new Date());
    const TARGET_ROW = row({
        date: plusDays(TODAY, 2),
        finish: true,
        session_index: 1,
        words_planned: 25,
    });
    const STATE = {
        rows: [TARGET_ROW],
        totalsByBookId: { "book-1": 500 },
    };

    const LABEL = estimateProgressLabel({
        getBookById: () => book({ pages_total: 740, progress_percent: 10 }),
        isSessionCompleted: () => false,
        row: TARGET_ROW,
        state: STATE,
    });

    assert.equal(
        LABEL,
        "Estimated by end of this session: 740 pages read (100% complete)",
    );
});
