/**
 * Verifies replans keep user-owned sessions and plan the rest around them.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { nextDayKey, todayDayKey } from "../dist/renderer/app/date_keys.js";
import { replanPolicy } from "../dist/renderer/app/plan-replan-policy.js";
import { mergeScheduleRows } from "../dist/renderer/app/schedule_preserve.js";

const TODAY = todayDayKey();
const TOMORROW = nextDayKey(TODAY);
const DAY_AFTER = nextDayKey(TOMORROW);

/**
 * Builds schedule row fixture with override support.
 * @param {Record<string, unknown>} overrides - Row field overrides.
 * @returns {Record<string, unknown>} Row fixture.
 */
function row(overrides = {}) {
    return {
        book_id: "book-1",
        date: TOMORROW,
        minutes: 20,
        session_index: 1,
        title: "Book 1",
        words_planned: 2000,
        ...overrides,
    };
}

function bookIdsOn(rows, date) {
    return rows
        .filter((entry) => entry.date === date)
        .map((entry) => entry.book_id);
}

test("automatic replans keep a future manual session and skip its book that day", () => {
    const MANUAL = row({ locked: true, session_index: 1 });
    const MERGED = mergeScheduleRows({
        nextRows: [
            row({ book_id: "book-1", session_index: 1, words_planned: 9 }),
            row({ book_id: "book-2", session_index: 2 }),
        ],
        previousRows: [MANUAL],
    });

    assert.deepEqual(bookIdsOn(MERGED, TOMORROW), ["book-1", "book-2"]);
    assert.equal(MERGED[0], MANUAL);
});

test("automatic replans drop unlocked future rows they did not regenerate", () => {
    const MERGED = mergeScheduleRows({
        nextRows: [],
        previousRows: [row()],
    });
    assert.deepEqual(MERGED, []);
});

test("completed future sessions survive replans", () => {
    const DONE = row({ date: DAY_AFTER });
    const MERGED = mergeScheduleRows({
        nextRows: [],
        previousRows: [DONE],
        scheduleCompletions: { [`${DAY_AFTER}|1|book-1`]: true },
    });
    assert.deepEqual(MERGED, [DONE]);
});

test("Replan Today keeps unfinished locked sessions for today", () => {
    const LOCKED = row({ date: TODAY, locked: true });
    const MERGED = mergeScheduleRows({
        nextRows: [row({ book_id: "book-2", date: TODAY, session_index: 2 })],
        preservationMode: "completed_today",
        previousRows: [LOCKED, row({ book_id: "book-3", date: TODAY })],
    });
    assert.deepEqual(bookIdsOn(MERGED, TODAY), ["book-1", "book-2"]);
});

test("automatic replans leave today alone after a removal empties it", () => {
    const POLICY = replanPolicy({
        blockedDayBooks: { [`${TODAY}|book-1`]: true },
        completions: {},
        explicitToday: false,
        previousRows: [],
        todayKey: TODAY,
    });
    assert.equal(POLICY.minimumStartDate, TOMORROW);
});

test("replan policy reserves locked sessions and excludes removed books", () => {
    const POLICY = replanPolicy({
        blockedDayBooks: { [`${DAY_AFTER}|book-2`]: true },
        completions: {},
        explicitToday: false,
        previousRows: [row({ locked: true }), row({ book_id: "book-3" })],
        todayKey: TODAY,
    });

    assert.deepEqual(POLICY.settingsOverrides, {
        excluded_book_ids_by_date: { [DAY_AFTER]: ["book-2"] },
        reserved_book_ids_by_date: { [TOMORROW]: ["book-1"] },
        reserved_minutes_by_date: { [TOMORROW]: 20 },
        reserved_sessions_by_date: { [TOMORROW]: 1 },
        reserved_words_by_book_id: { "book-1": 2000 },
    });
});

test("completed locked sessions reserve capacity but not words", () => {
    const POLICY = replanPolicy({
        completions: { [`${TOMORROW}|1|book-1`]: true },
        explicitToday: false,
        previousRows: [row({ locked: true })],
        todayKey: TODAY,
    });
    assert.equal(POLICY.settingsOverrides.reserved_words_by_book_id, undefined);
    assert.deepEqual(POLICY.settingsOverrides.reserved_minutes_by_date, {
        [TOMORROW]: 20,
    });
});
