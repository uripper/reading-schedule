import test from "node:test";
import assert from "node:assert/strict";

import { normalizeBook } from "../dist/renderer/books/model.js";
import { applyScheduledDaysToShelfBooks } from "../dist/renderer/books/save_scheduled_days.js";
import { BOOK_WEEKDAYS } from "../dist/renderer/books/scheduled_days.js";

/**
 * Builds canonical book fixture with override support.
 * @param {Record<string, unknown>} overrides Book field overrides.
 * @returns {Record<string, unknown>} Book fixture object.
 */
function book(overrides = {}) {
  return {
    book_id: "book-1",
    title: "Book",
    author: "",
    words_total: 1000,
    pages_total: null,
    pages_read: null,
    progress_percent: 0,
    priority: 3,
    difficulty: 3,
    min_blocks_per_session: 1,
    max_minutes_per_day: null,
    deadline: null,
    blocked_by: null,
    shelf: "",
    scheduled_days: [...BOOK_WEEKDAYS],
    status: "to_read",
    finished_at: null,
    cover_url: "",
    cover_local_path: "",
    lookup_note: "",
    ...overrides,
  };
}

test("normalizeBook defaults scheduled days to all weekdays", () => {
  const normalized = normalizeBook({
    title: "Default Days",
    words_total: 1000,
  });

  assert.deepEqual(normalized.scheduled_days, BOOK_WEEKDAYS);
});

test("normalizeBook normalizes scheduled-day order and removes invalid values", () => {
  const normalized = normalizeBook({
    title: "Ordered Days",
    words_total: 1000,
    scheduled_days: ["Fri", "Mon", "Fri", "BadDay"],
  });

  assert.deepEqual(normalized.scheduled_days, ["Mon", "Fri"]);
});

test("applyScheduledDaysToShelfBooks updates only matching shelf books", () => {
  const nextDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const source = book({
    book_id: "work-1",
    shelf: "Work",
    scheduled_days: nextDays,
  });
  const books = [
    source,
    book({ book_id: "work-2", shelf: "Work", scheduled_days: ["Sat"] }),
    book({ book_id: "home-1", shelf: "Home", scheduled_days: ["Sat"] }),
  ];

  const result = applyScheduledDaysToShelfBooks(books, source);
  assert.deepEqual(result[0].scheduled_days, nextDays);
  assert.deepEqual(result[1].scheduled_days, nextDays);
  assert.deepEqual(result[2].scheduled_days, ["Sat"]);
});
