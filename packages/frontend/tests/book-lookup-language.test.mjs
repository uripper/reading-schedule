// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { describeLookup } from "../dist/renderer/book_lookup/helpers.js";
import { lookupLanguageLabel } from "../dist/renderer/book_lookup/language.js";

test("lookupLanguageLabel names translated edition languages", () => {
    assert.equal(lookupLanguageLabel("spa"), "Spanish");
    assert.equal(lookupLanguageLabel("fre"), "French");
    assert.equal(lookupLanguageLabel(" GER "), "German");
});

test("lookupLanguageLabel hides English and invalid codes", () => {
    assert.equal(lookupLanguageLabel("eng"), "");
    assert.equal(lookupLanguageLabel(undefined), "");
    assert.equal(lookupLanguageLabel("not-a-code"), "");
});

test("describeLookup records the selected edition language", () => {
    assert.equal(
        describeLookup({
            author: "Umberto Eco",
            language: "spa",
            source: "Open Library",
            title: "El nombre de la rosa",
            year: 1980,
        }),
        "Selected from Open Library · Umberto Eco · 1980 · Spanish",
    );
    assert.equal(
        describeLookup({
            author: "Frank Herbert",
            language: "eng",
            source: "Open Library",
        }),
        "Selected from Open Library · Frank Herbert",
    );
});
