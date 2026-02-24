import test from "node:test";
import assert from "node:assert/strict";

import { blockerMeta } from "../dist/renderer/books/presenters.js";

/**
 * Builds minimal book fixture overrides for blocker metadata tests.
 * @param {Record<string, unknown>} overrides Partial field overrides.
 * @returns {{book_id: string, blocked_by: string|null}} Book fixture.
 */
function book(overrides = {}) {
  return {
    book_id: "book-a",
    blocked_by: null,
    ...overrides,
  };
}

test("blockerMeta returns null when blocker id is missing", () => {
  assert.equal(blockerMeta(book(), {}), null);
});

test("blockerMeta resolves blocker title while keeping blocker id", () => {
  const result = blockerMeta(book({ blocked_by: "book-b" }), {
    "book-b": "Powerful Python",
  });
  assert.deepEqual(result, {
    blockerBookId: "book-b",
    label: "After: Powerful Python",
  });
});

test("blockerMeta falls back to blocker id when title lookup misses", () => {
  const result = blockerMeta(book({ blocked_by: "book-b" }), {});
  assert.deepEqual(result, {
    blockerBookId: "book-b",
    label: "After: book-b",
  });
});
