import test from "node:test";
import assert from "node:assert/strict";

import { booksMatchingTitleQuery } from "../dist/renderer/calendar/details_manual_add_helpers.js";

const sampleBooks = [
  { bookId: "1", title: "Against Interpretation" },
  { bookId: "2", title: "The Savage Detectives" },
  { bookId: "3", title: "As I Lay Dying" },
];

test("booksMatchingTitleQuery returns all books for empty query", () => {
  const results = booksMatchingTitleQuery(sampleBooks, "");
  assert.deepEqual(results, sampleBooks);
});

test("booksMatchingTitleQuery narrows by case-insensitive substring", () => {
  const oneLetter = booksMatchingTitleQuery(sampleBooks, "a");
  assert.equal(oneLetter.length, 3);

  const against = booksMatchingTitleQuery(sampleBooks, "against");
  assert.equal(against.length, 1);
  assert.equal(against[0].bookId, "1");

  const noMatches = booksMatchingTitleQuery(sampleBooks, "zzzz");
  assert.equal(noMatches.length, 0);
});
