import assert from "node:assert/strict";
import test from "node:test";

import {
    anyFieldMatchesNormalizedQuery,
    normalizeTitleFilterQuery,
} from "../dist/renderer/title_filter.js";

test("normalizeTitleFilterQuery trims and lowercases query text", () => {
    const NORMALIZED = normalizeTitleFilterQuery("  AGAINST  ");
    assert.equal(NORMALIZED, "against");
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
