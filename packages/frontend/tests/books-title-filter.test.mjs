// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { matchesTitleFilter } from "../dist/renderer/books/controller_render_helpers.js";

const BOOK = (title, author = "") => {
    return { author, title };
};

function assertKeywordMatch(query, expected) {
    assert.equal(
        matchesTitleFilter(BOOK("Against Interpretation", "Susan Sontag"), query),
        expected,
    );
}

test("matchesTitleFilter returns true for empty filters", () => {
    assert.equal(matchesTitleFilter(BOOK("Against Interpretation"), ""), true);
    assert.equal(
        matchesTitleFilter(BOOK("Against Interpretation"), "   "),
        true,
    );
});

test("matchesTitleFilter applies case-insensitive keyword matching", () => {
    assertKeywordMatch("against", true);
    assertKeywordMatch("TERPRET", true);
    assertKeywordMatch("sontag", true);
    assertKeywordMatch("orwell", false);
});
