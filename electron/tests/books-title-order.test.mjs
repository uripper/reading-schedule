import test from "node:test";
import assert from "node:assert/strict";

import { finishDatesByBookId } from "../dist/renderer/books/finish_dates.js";
import {
  GROUP_BY_TITLE_LETTER,
  groupBooks,
} from "../dist/renderer/books/grouping.js";
import {
  SORT_BY_ESTIMATED_FINISH,
  SORT_BY_TITLE,
  sortBooks,
} from "../dist/renderer/books/sort.js";

/**
 * Builds canonical book fixture with override support.
 * @param {Record<string, unknown>} overrides Book field overrides.
 * @returns {Record<string, unknown>} Book fixture object.
 */
function baseBook(overrides) {
  return {
    book_id: "",
    title: "",
    author: "",
    words_total: null,
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
    status: "to_read",
    finished_at: null,
    cover_url: "",
    cover_local_path: "",
    lookup_note: "",
    ...overrides,
  };
}

test('groupBooks groups "The ..." by the next word letter', () => {
  const books = [
    baseBook({ book_id: "book-1", title: "The Book of Disquiet" }),
    baseBook({ book_id: "book-2", title: "Another Book" }),
  ];
  const groups = groupBooks(books, GROUP_BY_TITLE_LETTER, {});
  assert.equal(groups.length, 2);
  assert.equal(groups[0].label, "A");
  assert.equal(groups[1].label, "B");
});

test('sortBooks sorts titles using key without leading "The "', () => {
  const books = [
    baseBook({ book_id: "book-1", title: "The Odyssey" }),
    baseBook({ book_id: "book-2", title: "The Book of Disquiet" }),
  ];
  const sorted = sortBooks(books, SORT_BY_TITLE, "asc", {});
  assert.equal(sorted[0].title, "The Book of Disquiet");
  assert.equal(sorted[1].title, "The Odyssey");
});

test("finishDatesByBookId uses explicit finished_at for read books", () => {
  const rows = [{ book_id: "book-1", date: "2026-12-22", session_index: 1 }];
  const books = [
    baseBook({ book_id: "book-1", status: "read", finished_at: "2026-01-10" }),
    baseBook({ book_id: "book-2", status: "read", finished_at: "2026-01-20" }),
  ];

  const finishDates = finishDatesByBookId(rows, books);
  assert.equal(finishDates["book-1"], "2026-01-10");
  assert.equal(finishDates["book-2"], "2026-01-20");
});

test("sortBooks by estimated finish includes finished read books in date order", () => {
  const books = [
    baseBook({ book_id: "book-1", title: "Anna Karenina" }),
    baseBook({
      book_id: "book-2",
      title: "Ice",
      status: "read",
      finished_at: "2026-01-10",
    }),
    baseBook({
      book_id: "book-3",
      title: "White Noise",
      status: "read",
      finished_at: "2026-01-20",
    }),
  ];
  const rows = [{ book_id: "book-1", date: "2026-12-22", session_index: 1 }];

  const finishDates = finishDatesByBookId(rows, books);
  const sorted = sortBooks(books, SORT_BY_ESTIMATED_FINISH, "asc", finishDates);
  assert.deepEqual(
    sorted.map((book) => book.book_id),
    ["book-2", "book-3", "book-1"],
  );
});
