import test from "node:test";
import assert from "node:assert/strict";

import {
  nextSessionIndexForDate,
  rowsWithoutSession,
  wordsPlannedForManualSession,
} from "../dist/renderer/app/calendar_interactions.js";
import {
  historicalPaceRowsFixture,
  indexRowsFixture,
  removableRowsFixture,
} from "./calendar-manual-session.fixtures.mjs";

test("nextSessionIndexForDate appends after highest index on the same day", () => {
  const rows = indexRowsFixture();

  assert.equal(nextSessionIndexForDate(rows, "2026-02-20"), 4);
  assert.equal(nextSessionIndexForDate(rows, "2026-02-21"), 3);
  assert.equal(nextSessionIndexForDate(rows, "2026-02-22"), 1);
});

test("wordsPlannedForManualSession uses historical pace when available", () => {
  const rows = historicalPaceRowsFixture();

  const words = wordsPlannedForManualSession({
    bookId: "book-1",
    minutes: 15,
    rows,
    settings: { wpm_base: 250, difficulty_multiplier: { 3: 2 } },
    difficulty: 3,
  });

  assert.equal(words, 1600);
});

test("wordsPlannedForManualSession falls back to settings-based speed", () => {
  const words = wordsPlannedForManualSession({
    bookId: "book-1",
    minutes: 12,
    rows: [],
    settings: {
      wpm_base: 200,
      difficulty_multiplier: { 4: 0.75 },
    },
    difficulty: 4,
  });

  assert.equal(words, 1800);
});

test("rowsWithoutSession removes only the targeted row key", () => {
  const rows = removableRowsFixture();

  const nextRows = rowsWithoutSession(rows, "2026-02-20|2|book-1");

  assert.equal(nextRows.length, 2);
  assert.ok(
    nextRows.some((row) => row.book_id === "book-1" && row.session_index === 1),
  );
  assert.ok(
    nextRows.some((row) => row.book_id === "book-2" && row.session_index === 1),
  );
});

test("rowsWithoutSession preserves rows when session key is not found", () => {
  const rows = removableRowsFixture();

  const nextRows = rowsWithoutSession(rows, "2026-02-20|9|missing-book");

  assert.notEqual(nextRows, rows);
  assert.deepEqual(nextRows, rows);
});
