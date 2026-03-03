import assert from "node:assert/strict";
import test from "node:test";

import { enrichRows, groupRowsByDate } from "../dist/renderer/calendar/data.js";
import { rowsWithCompletedLast } from "../dist/renderer/calendar/details_helpers.js";
import { dayKey, sessionKeyFor } from "../dist/renderer/calendar/utils.js";

/**
 * Builds calendar row fixture with override support.
 * @param {Record<string, unknown>} overrides Row field overrides.
 * @returns {Record<string, unknown>} Row fixture.
 */
function row(overrides) {
    return {
        book_id: "book-1",
        date: "2026-02-22",
        finish: false,
        minutes: 10,
        session_index: 1,
        title: "Untitled",
        ...overrides,
    };
}

test("groupRowsByDate prioritizes expected-finish rows within each day", () => {
    const DATE = "2026-02-22";
    const GROUPED = groupRowsByDate([
        row({ book_id: "book-1", finish: false, session_index: 1 }),
        row({ book_id: "book-2", finish: true, session_index: 2 }),
        row({ book_id: "book-3", finish: false, session_index: 3 }),
        row({ book_id: "book-4", finish: true, session_index: 4 }),
    ]);

    assert.deepEqual(
        GROUPED[DATE].map((entry) => entry.book_id),
        ["book-2", "book-4", "book-1", "book-3"],
    );
});

test("rowsWithCompletedLast keeps expected-finish rows first inside incomplete and complete groups", () => {
    const ROWS = [
        row({
            book_id: "book-complete-finish",
            finish: true,
            session_index: 1,
        }),
        row({
            book_id: "book-incomplete-normal",
            finish: false,
            session_index: 2,
        }),
        row({
            book_id: "book-incomplete-finish",
            finish: true,
            session_index: 3,
        }),
        row({
            book_id: "book-complete-normal",
            finish: false,
            session_index: 4,
        }),
    ];

    const COMPLETED_SESSION_KEYS = new Set([
        sessionKeyFor(ROWS[0]),
        sessionKeyFor(ROWS[3]),
    ]);

    const ORDERED = rowsWithCompletedLast(ROWS, {
        getBookById: () => null,
        isSessionCompleted: (sessionKey) =>
            COMPLETED_SESSION_KEYS.has(sessionKey),
        onSessionCompletionChanged: () => null,
        onSessionProgressUpdated: () => null,
    });

    assert.deepEqual(
        ORDERED.map((entry) => entry.book_id),
        [
            "book-incomplete-finish",
            "book-incomplete-normal",
            "book-complete-finish",
            "book-complete-normal",
        ],
    );
});

test("enrichRows moves expected-finish forward when today row is marked complete", () => {
    const TODAY = dayKey(new Date());
    const TOMORROW_DATE = new Date(`${TODAY}T00:00:00`);
    TOMORROW_DATE.setDate(TOMORROW_DATE.getDate() + 1);
    const TOMORROW = dayKey(TOMORROW_DATE);

    const TODAY_ROW = row({
        book_id: "book-1",
        date: TODAY,
        session_index: 1,
        words_planned: 100,
    });
    const TOMORROW_ROW = row({
        book_id: "book-1",
        date: TOMORROW,
        session_index: 1,
        words_planned: 100,
    });
    const TOTALS = { "book-1": 100 };

    const ENRICHED = enrichRows(
        [TODAY_ROW, TOMORROW_ROW],
        TOTALS,
        (sessionKey) => sessionKey === sessionKeyFor(TODAY_ROW),
    );

    assert.equal(ENRICHED[0]?.finish, false);
    assert.equal(ENRICHED[1]?.finish, true);
});
