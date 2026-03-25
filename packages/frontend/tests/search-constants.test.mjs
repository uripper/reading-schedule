// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    AUTHOR_MAX_LENGTH,
    AUTHOR_MAX_WORDS,
    AUTHOR_MIN_KEY_LENGTH,
    MAX_AUTHORS,
    MAX_PER_AUTHOR,
    NON_BOOK_TITLE_PATTERNS,
    SAMPLE_RESULTS_COUNT,
    TITLE_MAX_LENGTH,
    TITLE_MIN_LENGTH,
    WORDS_PER_PAGE_ESTIMATE,
} from "../dist/renderer/recommendations/search_constants.js";

test("recommendation search constants keep sane filter bounds", () => {
    assert.ok(MAX_AUTHORS > 0);
    assert.ok(MAX_PER_AUTHOR > 0);
    assert.ok(SAMPLE_RESULTS_COUNT > 0);
    assert.ok(TITLE_MAX_LENGTH > TITLE_MIN_LENGTH);
    assert.ok(AUTHOR_MAX_LENGTH >= AUTHOR_MIN_KEY_LENGTH);
    assert.ok(AUTHOR_MAX_WORDS > 0);
    assert.ok(WORDS_PER_PAGE_ESTIMATE > 0);
});

test("recommendation search constants include known non-book title filters", () => {
    assert.ok(NON_BOOK_TITLE_PATTERNS.includes("journal"));
    assert.ok(NON_BOOK_TITLE_PATTERNS.includes("conference"));
    assert.equal(
        new Set(NON_BOOK_TITLE_PATTERNS).size,
        NON_BOOK_TITLE_PATTERNS.length,
    );
});
