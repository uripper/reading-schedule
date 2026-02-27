import test from "node:test";
import assert from "node:assert/strict";

import { matchesTitleFilter } from "../dist/renderer/books/controller_render_helpers.js";

const book = (title) => {
  return { title };
};

test("matchesTitleFilter returns true for empty filters", () => {
  assert.equal(matchesTitleFilter(book("Against Interpretation"), ""), true);
  assert.equal(matchesTitleFilter(book("Against Interpretation"), "   "), true);
});

test("matchesTitleFilter applies case-insensitive substring matching", () => {
  assert.equal(
    matchesTitleFilter(book("Against Interpretation"), "against"),
    true,
  );
  assert.equal(
    matchesTitleFilter(book("Against Interpretation"), "TERPRET"),
    true,
  );
  assert.equal(
    matchesTitleFilter(book("Against Interpretation"), "orwell"),
    false,
  );
});
