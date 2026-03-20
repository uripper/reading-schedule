// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { matchesTitleFilter } from "../dist/renderer/books/controller_render_helpers.js";

const BOOK = (title) => {
    return { title };
};

test("matchesTitleFilter returns true for empty filters", () => {
    assert.equal(matchesTitleFilter(BOOK("Against Interpretation"), ""), true);
    assert.equal(
        matchesTitleFilter(BOOK("Against Interpretation"), "   "),
        true,
    );
});

test("matchesTitleFilter applies case-insensitive substring matching", () => {
    assert.equal(
        matchesTitleFilter(BOOK("Against Interpretation"), "against"),
        true,
    );
    assert.equal(
        matchesTitleFilter(BOOK("Against Interpretation"), "TERPRET"),
        true,
    );
    assert.equal(
        matchesTitleFilter(BOOK("Against Interpretation"), "orwell"),
        false,
    );
});
