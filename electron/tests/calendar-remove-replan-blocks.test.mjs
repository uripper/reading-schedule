import assert from "node:assert/strict";
import test from "node:test";

import { removeSessionRow } from "../dist/renderer/app/calendar_interactions/calendar_interactions_schedule_updates.js";
import { mergeScheduleRows } from "../dist/renderer/app/schedule_preserve.js";

/**
 * Builds schedule row fixture with override support.
 * @param {Record<string, unknown>} overrides Row field overrides.
 * @returns {Record<string, unknown>} Row fixture.
 */
function row(overrides = {}) {
    return {
        book_id: "book-1",
        date: "2026-02-24",
        minutes: 15,
        session_index: 1,
        title: "Book 1",
        words_planned: 1500,
        ...overrides,
    };
}

test("removeSessionRow blocks the same day-book pair from future replan merges", () => {
    const REMOVED_ROW = row();
    const KEEP_ROW = row({
        book_id: "book-2",
        date: "2026-02-25",
        session_index: 1,
        title: "Book 2",
    });
    const STATE = {
        blockedDayBooks: {},
        lastResult: {
            created_at: "2026-02-23T00:00:00.000Z",
            schedule: [REMOVED_ROW, KEEP_ROW],
            summary: null,
        },
        scheduleCompletions: {},
    };
    let updates = 0;
    const MARK_UPDATED = () => {
        updates += 1;
    };

    const REMOVED = removeSessionRow({
        onScheduleRowsUpdated: MARK_UPDATED,
        queuePersist: MARK_UPDATED,
        renderCalendar: MARK_UPDATED,
        row: REMOVED_ROW,
        setBookScheduleRows: MARK_UPDATED,
        setLastResult: (result) => {
            STATE.lastResult = result;
        },
        setStatus: MARK_UPDATED,
        state: STATE,
        totalsFromSummary: () => ({}),
    });

    assert.equal(REMOVED, true);
    assert.equal(STATE.blockedDayBooks["2026-02-24|book-1"], true);
    assert.ok(updates > 0);

    const REPLANNED_ROWS = [REMOVED_ROW, KEEP_ROW];
    const MERGED = mergeScheduleRows(
        [],
        REPLANNED_ROWS,
        [],
        STATE.blockedDayBooks,
    );

    assert.equal(
        MERGED.some(
            (entry) =>
                entry.date === "2026-02-24" && entry.book_id === "book-1",
        ),
        false,
    );
});
