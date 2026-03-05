import assert from "node:assert/strict";
import test from "node:test";

import {
    mergeScheduleRows,
    pruneScheduleCompletions,
} from "../dist/renderer/app/schedule_preserve.js";
import { sessionKeyFor } from "../dist/renderer/calendar/utils.js";

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
 * Builds schedule row fixture with override support.
 * @param {Record<string, unknown>} overrides - Row field overrides.
 * @returns {Record<string, unknown>} Row fixture.
 */
function row(overrides = {}) {
    return {
        book_id: "book-1",
        date: "2026-02-20",
        minutes: 10,
        session_index: 1,
        title: "Book 1",
        words_planned: 1000,
        ...overrides,
    };
}

test("pruneScheduleCompletions keeps day-book fallback keys for rows that still exist", () => {
    const KEPT_ROW = row();
    const DROPPED_ROW = row({
        book_id: "book-2",
        date: "2026-02-21",
        session_index: 1,
    });
    const COMPLETIONS = {
        [sessionKeyFor(KEPT_ROW)]: true,
        [`${KEPT_ROW.date}|${KEPT_ROW.book_id}`]: true,
        [sessionKeyFor(DROPPED_ROW)]: true,
        [`${DROPPED_ROW.date}|${DROPPED_ROW.book_id}`]: true,
    };
    const PRUNED = pruneScheduleCompletions(COMPLETIONS, [KEPT_ROW]);
    assert.deepEqual(PRUNED, {
        [sessionKeyFor(KEPT_ROW)]: true,
        [`${KEPT_ROW.date}|${KEPT_ROW.book_id}`]: true,
    });
});

test("pruneScheduleCompletions removes stale day-book keys when matching row no longer exists", () => {
    const KEEP_ROW = row();
    const COMPLETIONS = {
        [`${KEEP_ROW.date}|${KEEP_ROW.book_id}`]: true,
        "2026-02-25|book-missing": true,
    };
    const PRUNED = pruneScheduleCompletions(COMPLETIONS, [KEEP_ROW]);
    assert.deepEqual(PRUNED, {
        [`${KEEP_ROW.date}|${KEEP_ROW.book_id}`]: true,
    });
});

test("mergeScheduleRows preserves locked-day rows even when book is no longer in future plan", () => {
    const TODAY = dayKey(new Date());
    const TOMORROW = plusDays(TODAY, 1);
    const PREVIOUS_ROWS = [
        row({ book_id: "book-complete", date: TODAY, session_index: 1 }),
        row({ book_id: "book-active", date: TODAY, session_index: 2 }),
        row({ book_id: "book-complete", date: TOMORROW, session_index: 1 }),
        row({ book_id: "book-active", date: TOMORROW, session_index: 2 }),
    ];
    const NEXT_ROWS = [
        row({ book_id: "book-active", date: TOMORROW, session_index: 1 }),
    ];
    const MERGED = mergeScheduleRows(PREVIOUS_ROWS, NEXT_ROWS, []);
    const BOOK_IDS = MERGED.map((entry) => entry.book_id);
    assert.ok(
        BOOK_IDS.includes("book-complete"),
        "locked-day rows should be preserved",
    );
    assert.ok(
        BOOK_IDS.includes("book-active"),
        "active book rows should be preserved",
    );
});

test("mergeScheduleRows keeps past-day rows for books still in new schedule", () => {
    const TODAY = dayKey(new Date());
    const YESTERDAY = plusDays(TODAY, -1);
    const TOMORROW = plusDays(TODAY, 1);
    const PREVIOUS_ROWS = [
        row({
            book_id: "book-1",
            date: YESTERDAY,
            session_index: 1,
            words_planned: 500,
        }),
        row({
            book_id: "book-1",
            date: TOMORROW,
            session_index: 1,
            words_planned: 500,
        }),
    ];
    const NEXT_ROWS = [
        row({
            book_id: "book-1",
            date: TOMORROW,
            session_index: 1,
            words_planned: 500,
        }),
    ];
    const MERGED = mergeScheduleRows(PREVIOUS_ROWS, NEXT_ROWS, []);
    const YESTERDAY_ROWS = MERGED.filter((entry) => entry.date === YESTERDAY);
    assert.equal(YESTERDAY_ROWS.length, 1);
    assert.equal(YESTERDAY_ROWS[0].book_id, "book-1");
});

test("mergeScheduleRows preserves today rows while still rebuilding tomorrow onward", () => {
    const TODAY = dayKey(new Date());
    const TOMORROW = plusDays(TODAY, 1);
    const PREVIOUS_ROWS = [
        row({
            book_id: "book-1",
            date: TODAY,
            session_index: 1,
            words_planned: 500,
        }),
        row({
            book_id: "book-1",
            date: TOMORROW,
            session_index: 1,
            words_planned: 500,
        }),
    ];
    const NEXT_ROWS = [
        row({
            book_id: "book-1",
            date: TOMORROW,
            session_index: 1,
            words_planned: 700,
        }),
    ];
    const MERGED = mergeScheduleRows(PREVIOUS_ROWS, NEXT_ROWS, []);
    const TODAY_ROWS = MERGED.filter((entry) => entry.date === TODAY);
    const TOMORROW_ROWS = MERGED.filter((entry) => entry.date === TOMORROW);
    assert.equal(TODAY_ROWS.length, 1);
    assert.equal(TODAY_ROWS[0].words_planned, 500);
    assert.equal(TOMORROW_ROWS.length, 1);
    assert.equal(TOMORROW_ROWS[0].words_planned, 700);
});

test("mergeScheduleRows excludes day-book pairs that were manually blocked", () => {
    const BLOCKED_KEY = "2026-02-24|book-1";
    const NEXT_ROWS = [
        row({ book_id: "book-1", date: "2026-02-24", session_index: 1 }),
        row({ book_id: "book-2", date: "2026-02-24", session_index: 2 }),
    ];
    const MERGED = mergeScheduleRows([], NEXT_ROWS, [], {
        [BLOCKED_KEY]: true,
    });
    assert.equal(MERGED.length, 1);
    assert.equal(MERGED[0].book_id, "book-2");
});

test("mergeScheduleRows does not lock malformed day keys from previous rows", () => {
    const PREVIOUS_ROWS = [
        row({ book_id: "book-1", date: "2026-2-4", session_index: 1 }),
        row({ book_id: "book-2", date: "2026/02/04", session_index: 2 }),
    ];
    const MERGED = mergeScheduleRows(PREVIOUS_ROWS, [], []);
    assert.equal(MERGED.length, 0);
});
