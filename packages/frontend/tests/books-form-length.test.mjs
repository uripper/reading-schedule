// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { deriveLengthAndProgress } from "../dist/renderer/books/form-state-helpers.js";

function input(value = "") {
    return { value };
}

function refs(overrides = {}) {
    return {
        pagesReadInput: input(""),
        pagesTotalInput: input(""),
        progressInput: input("0"),
        wordsInput: input(""),
        ...overrides,
    };
}

test("deriveLengthAndProgress estimates words from pages when words are blank", () => {
    const PARSED = deriveLengthAndProgress(
        refs({
            pagesTotalInput: input("200"),
            wordsInput: input(""),
        }),
    );

    assert.equal(PARSED.pagesTotal, 200);
    assert.equal(PARSED.wordsTotal, 60000);
});

test("deriveLengthAndProgress preserves explicit word totals", () => {
    const PARSED = deriveLengthAndProgress(
        refs({
            pagesTotalInput: input("200"),
            wordsInput: input("50000"),
        }),
    );

    assert.equal(PARSED.wordsTotal, 50000);
});
