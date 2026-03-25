// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    titleInitialLetter,
    titleSortKey,
} from "../dist/renderer/books/title_key.js";

test('titleSortKey strips leading "The "', () => {
    assert.equal(titleSortKey("The Odyssey"), "Odyssey");
    assert.equal(titleSortKey("  the   Trial  "), "Trial");
});

test('titleSortKey keeps title when "The" has no trailing space', () => {
    assert.equal(titleSortKey("The"), "The");
});

test("titleInitialLetter uses first letter after stripped article", () => {
    assert.equal(titleInitialLetter("The Book of Disquiet"), "B");
});
