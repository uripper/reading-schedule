import test from "node:test";
import assert from "node:assert/strict";

import { findRecommendations } from "../dist/renderer/recommendations/search.js";

/**
 * Builds a valid book-like test object with optional overrides.
 * @param {Record<string, unknown>} overrides Partial fixture overrides.
 * @returns {Record<string, unknown>} Book-like fixture object.
 */
function book(overrides = {}) {
  return {
    book_id: "book-default",
    title: "Default Title",
    author: "",
    words_total: 50000,
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

test("findRecommendations queries read authors and filters existing titles", async () => {
  const calls = [];
  const api = {
    searchBooks(query) {
      calls.push(query);
      return Promise.resolve([
        {
          title: "Homage to Catalonia",
          author: "George Orwell",
          words_estimate: 73000,
        },
        {
          title: "Keep the Aspidistra Flying",
          author: "George Orwell",
          words_estimate: 89000,
        },
      ]);
    },
  };

  const recommendations = await findRecommendations(
    [
      book({
        title: "Animal Farm",
        author: "George Orwell",
        status: "read",
      }),
      book({
        title: "Homage to Catalonia",
        author: "George Orwell",
        status: "to_read",
      }),
    ],
    api,
  );

  assert.equal(calls[0], "George Orwell");
  assert.equal(recommendations.some((item) => item.title === "Homage to Catalonia"), false);
  assert.equal(
    recommendations.some((item) => item.title === "Keep the Aspidistra Flying"),
    true,
  );
});
