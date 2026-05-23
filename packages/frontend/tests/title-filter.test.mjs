// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    anyFieldMatchesNormalizedQuery,
    normalizeTitleFilterQuery,
    titleMatchesNormalizedQuery,
} from "../dist/renderer/title_filter.js";

test("normalizeTitleFilterQuery trims and lowercases query text", () => {
    const NORMALIZED = normalizeTitleFilterQuery("  AGAINST  ");
    assert.equal(NORMALIZED, "against");
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

test("anyFieldMatchesNormalizedQuery matches across multiple candidate fields", () => {
    assert.equal(
        anyFieldMatchesNormalizedQuery(
            ["Against Interpretation", "Susan Sontag"],
            "sontag",
        ),
        true,
    );
    assert.equal(
        anyFieldMatchesNormalizedQuery(
            ["Against Interpretation", "Susan Sontag"],
            "orwell",
        ),
        false,
    );
});
