import assert from "node:assert/strict";
import test from "node:test";

import {
    normalizeTitleFilterQuery,
    titleMatchesNormalizedQuery,
} from "../dist/renderer/title_filter.js";

test("normalizeTitleFilterQuery trims and lowercases query text", () => {
    const normalized = normalizeTitleFilterQuery("  AGAINST  ");
    assert.equal(normalized, "against");
});

test("titleMatchesNormalizedQuery supports empty query and substring matching", () => {
    assert.equal(
        titleMatchesNormalizedQuery("Against Interpretation", ""),
        true,
    );
    assert.equal(
        titleMatchesNormalizedQuery("Against Interpretation", "terpret"),
        true,
    );
    assert.equal(
        titleMatchesNormalizedQuery("Against Interpretation", "orwell"),
        false,
    );
});
