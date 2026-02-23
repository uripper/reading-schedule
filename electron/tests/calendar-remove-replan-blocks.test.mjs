import test from "node:test";
import assert from "node:assert/strict";

import { removeSessionRow } from "../dist/renderer/app/calendar_interactions/calendar_interactions_schedule_updates.js";
import { mergeScheduleRows } from "../dist/renderer/app/schedule_preserve.js";

/**
 * Builds schedule row fixture with override support.
 * @param {Record<string, unknown>} overrides Row field overrides.
 * @returns {Record<string, unknown>} Row fixture.
 */
function row(overrides = {}) {
  return {
    date: "2026-02-24",
    session_index: 1,
    book_id: "book-1",
    title: "Book 1",
    minutes: 15,
    words_planned: 1500,
    ...overrides,
  };
}

test("removeSessionRow blocks the same day-book pair from future replan merges", () => {
  const removedRow = row();
  const keepRow = row({
    date: "2026-02-25",
    session_index: 1,
    book_id: "book-2",
    title: "Book 2",
  });
  const state = {
    lastResult: {
      schedule: [removedRow, keepRow],
      summary: null,
      created_at: "2026-02-23T00:00:00.000Z",
    },
    scheduleCompletions: {},
    blockedDayBooks: {},
  };

  const removed = removeSessionRow({
    row: removedRow,
    onScheduleRowsUpdated: () => {},
    queuePersist: () => {},
    renderCalendar: () => {},
    setBookScheduleRows: () => {},
    setLastResult: (result) => {
      state.lastResult = result;
    },
    setStatus: () => {},
    state,
    totalsFromSummary: () => ({}),
  });

  assert.equal(removed, true);
  assert.equal(state.blockedDayBooks["2026-02-24|book-1"], true);

  const replannedRows = [removedRow, keepRow];
  const merged = mergeScheduleRows([], replannedRows, [], state.blockedDayBooks);

  assert.equal(
    merged.some((entry) => entry.date === "2026-02-24" && entry.book_id === "book-1"),
    false,
  );
});
