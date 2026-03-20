// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const REQUIRE = createRequire(import.meta.url);
const { hasEnglishLanguage, normalizeSearchText, primaryAuthor, queryTokens } =
    REQUIRE("../dist/main/book_lookup/search-text.js");

test("normalizeSearchText lowercases and strips punctuation noise", () => {
    assert.equal(
        normalizeSearchText("  L'etranger: A Novel?!  "),
        "l etranger  a novel",
    );
});

test("queryTokens returns only normalized non-empty tokens", () => {
    assert.deepEqual(queryTokens("  Deep   Work!!!  "), ["deep", "work"]);
});

test("primaryAuthor returns the first listed author and handles missing authors", () => {
    assert.equal(
        primaryAuthor({ author_name: ["Cal Newport", "Ghost"] }),
        "Cal Newport",
    );
    assert.equal(primaryAuthor({ author_name: [] }), "");
    assert.equal(primaryAuthor({}), "");
});

test("hasEnglishLanguage recognizes canonical and namespaced english tags", () => {
    assert.equal(hasEnglishLanguage({ language: ["eng"] }), true);
    assert.equal(hasEnglishLanguage({ language: ["/languages/eng"] }), true);
    assert.equal(hasEnglishLanguage({ language: ["fre"] }), false);
    assert.equal(hasEnglishLanguage({}), false);
});
