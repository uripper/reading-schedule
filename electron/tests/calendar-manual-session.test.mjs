import test from "node:test";
import assert from "node:assert/strict";

import {
  nextSessionIndexForDate,
  rowsWithoutSession,
  wordsPlannedForManualSession,
} from "../dist/renderer/app/calendar_interactions.js";

test("nextSessionIndexForDate appends after highest index on the same day", () => {
  const rows = [
    {
      date: "2026-02-20",
      session_index: 1,
      book_id: "a",
      title: "A",
      minutes: 10,
      words_planned: 1000,
    },
    {
      date: "2026-02-20",
      session_index: 3,
      book_id: "b",
      title: "B",
      minutes: 15,
      words_planned: 1500,
    },
    {
      date: "2026-02-21",
      session_index: 2,
      book_id: "c",
      title: "C",
      minutes: 12,
      words_planned: 1200,
    },
  ];

  assert.equal(nextSessionIndexForDate(rows, "2026-02-20"), 4);
  assert.equal(nextSessionIndexForDate(rows, "2026-02-21"), 3);
  assert.equal(nextSessionIndexForDate(rows, "2026-02-22"), 1);
});

test("wordsPlannedForManualSession uses historical pace when available", () => {
  const rows = [
    {
      date: "2026-02-20",
      session_index: 1,
      book_id: "book-1",
      title: "Book",
      minutes: 10,
      words_planned: 1000,
    },
    {
      date: "2026-02-21",
      session_index: 1,
      book_id: "book-1",
      title: "Book",
      minutes: 5,
      words_planned: 600,
    },
  ];

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
  const rows = [
    {
      date: "2026-02-20",
      session_index: 1,
      book_id: "book-1",
      title: "Book 1",
      minutes: 10,
      words_planned: 1000,
    },
    {
      date: "2026-02-20",
      session_index: 2,
      book_id: "book-1",
      title: "Book 1",
      minutes: 12,
      words_planned: 1200,
    },
    {
      date: "2026-02-20",
      session_index: 1,
      book_id: "book-2",
      title: "Book 2",
      minutes: 9,
      words_planned: 900,
    },
  ];

  const nextRows = rowsWithoutSession(rows, "2026-02-20|2|book-1");

  assert.equal(nextRows.length, 2);
  assert.ok(
    nextRows.some((row) => row.book_id === "book-1" && row.session_index === 1),
  );
  assert.ok(
    nextRows.some((row) => row.book_id === "book-2" && row.session_index === 1),
  );
});
