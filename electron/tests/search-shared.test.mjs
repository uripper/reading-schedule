// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const REQUIRE = createRequire(import.meta.url);
const CONSTANTS = REQUIRE("../dist/main/book_lookup/search-shared.js");

test("search shared constants keep fetch and output limits in a sane range", () => {
    assert.ok(CONSTANTS.MIN_QUERY_LENGTH > 0);
    assert.ok(CONSTANTS.SEARCH_FETCH_LIMIT >= CONSTANTS.SEARCH_OUTPUT_LIMIT);
    assert.equal(CONSTANTS.SOURCE_NAME, "Open Library");
});

test("search shared status thresholds preserve redirect and error boundaries", () => {
    assert.ok(
        CONSTANTS.HTTP_STATUS_REDIRECT_MIN <
            CONSTANTS.HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE,
    );
    assert.ok(
        CONSTANTS.HTTP_STATUS_REDIRECT_MAX_EXCLUSIVE <=
            CONSTANTS.HTTP_STATUS_ERROR_MIN,
    );
    assert.ok(CONSTANTS.COVER_ID_MIN > 0);
    assert.ok(CONSTANTS.WORDS_PER_PAGE_ESTIMATE > 0);
});

test("search shared scoring keeps stronger matches above weaker ones", () => {
    assert.ok(CONSTANTS.SCORE_EXACT_TITLE > CONSTANTS.SCORE_PREFIX_TITLE);
    assert.ok(CONSTANTS.SCORE_PREFIX_TITLE > CONSTANTS.SCORE_CONTAINS_TITLE);
    assert.ok(CONSTANTS.SCORE_AUTHOR_EXACT > CONSTANTS.SCORE_AUTHOR_ALL_TOKENS);
    assert.ok(
        CONSTANTS.SCORE_AUTHOR_ALL_TOKENS >
            CONSTANTS.SCORE_AUTHOR_PARTIAL_TOKEN,
    );
    assert.ok(CONSTANTS.SCORE_MAX_EDITION_COUNT > 0);
});
