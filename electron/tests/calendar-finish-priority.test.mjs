import test from "node:test";
import assert from "node:assert/strict";

import { enrichRows, groupRowsByDate } from "../dist/renderer/calendar/data.js";
import { rowsWithCompletedLast } from "../dist/renderer/calendar/details_helpers.js";
import { dayKey, sessionKeyFor } from "../dist/renderer/calendar/utils.js";

/**
 * Builds calendar row fixture with override support.
 *
 * @param {Record<string, unknown>} overrides Row field overrides.
 * @returns {Record<string, unknown>} Row fixture.
 */
function row(overrides) {
  return {
    date: "2026-02-22",
    session_index: 1,
    book_id: "book-1",
    title: "Untitled",
    minutes: 10,
    finish: false,
    ...overrides,
  };
}

test("groupRowsByDate prioritizes expected-finish rows within each day", () => {
  const date = "2026-02-22";
  const grouped = groupRowsByDate([
    row({ session_index: 1, book_id: "book-1", finish: false }),
    row({ session_index: 2, book_id: "book-2", finish: true }),
    row({ session_index: 3, book_id: "book-3", finish: false }),
    row({ session_index: 4, book_id: "book-4", finish: true }),
  ]);

  assert.deepEqual(
    grouped[date].map((entry) => entry.book_id),
    ["book-2", "book-4", "book-1", "book-3"],
  );
});

test("rowsWithCompletedLast keeps expected-finish rows first inside incomplete and complete groups", () => {
  const rows = [
    row({ session_index: 1, book_id: "book-complete-finish", finish: true }),
    row({ session_index: 2, book_id: "book-incomplete-normal", finish: false }),
    row({ session_index: 3, book_id: "book-incomplete-finish", finish: true }),
    row({ session_index: 4, book_id: "book-complete-normal", finish: false }),
  ];

  const completedSessionKeys = new Set([
    sessionKeyFor(rows[0]),
    sessionKeyFor(rows[3]),
  ]);

  const ordered = rowsWithCompletedLast(rows, {
    isSessionCompleted: (sessionKey) => completedSessionKeys.has(sessionKey),
    onSessionCompletionChanged: () => {},
    onSessionProgressUpdated: () => null,
    getBookById: () => null,
  });

  assert.deepEqual(
    ordered.map((entry) => entry.book_id),
    [
      "book-incomplete-finish",
      "book-incomplete-normal",
      "book-complete-finish",
      "book-complete-normal",
    ],
  );
});

test("enrichRows moves expected-finish forward when today row is marked complete", () => {
  const today = dayKey(new Date());
  const tomorrowDate = new Date(`${today}T00:00:00`);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = dayKey(tomorrowDate);

  const todayRow = row({
    date: today,
    session_index: 1,
    book_id: "book-1",
    words_planned: 100,
  });
  const tomorrowRow = row({
    date: tomorrow,
    session_index: 1,
    book_id: "book-1",
    words_planned: 100,
  });
  const totals = { "book-1": 100 };

  const enriched = enrichRows(
    [todayRow, tomorrowRow],
    totals,
    (sessionKey) => sessionKey === sessionKeyFor(todayRow),
  );

  assert.equal(enriched[0]?.finish, false);
  assert.equal(enriched[1]?.finish, true);
});
