// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const Require = createRequire(import.meta.url);
const { dedupeDocs } = Require("../dist/main/book_lookup/search-dedupe.js");
const { searchUrls } = Require("../dist/main/book_lookup/search-transport.js");
const { hasEnglishLanguage, normalizeSearchText, primaryAuthor, queryTokens } =
    Require("../dist/main/book_lookup/search-text.js");
const { scoreDoc } = Require("../dist/main/book_lookup/search-scoring.js");
const { SCORE_AUTHOR_EXACT } = Require(
    "../dist/main/book_lookup/search-shared.js",
);

/**
 * Builds a minimal Open Library document fixture.
 * @param {Record<string, unknown>} overrides - Partial document overrides.
 * @returns {Record<string, unknown>} Search document fixture.
 */
function searchDoc(overrides = {}) {
    return {
        author_name: ["George Orwell"],
        edition_count: undefined,
        key: "/works/default",
        language: [],
        number_of_pages_median: undefined,
        title: "Default Title",
        ...overrides,
    };
}

const DEDUPE_FIXTURE_DOCS = [
    searchDoc({
        author_name: ["George Orwell"],
        key: "/works/1",
        title: "Animal Farm",
    }),
    searchDoc({
        author_name: ["Another Author"],
        key: "/works/1",
        title: "Duplicate Key",
    }),
    searchDoc({
        author_name: ["Jane Austen"],
        key: "",
        title: "Persuasion",
    }),
    searchDoc({
        author_name: ["Jane Austen"],
        key: "",
        title: "Persuasion",
    }),
    searchDoc({
        author_name: [],
        key: "",
        title: "",
    }),
];

function authorOnlyDoc(authorName) {
    return searchDoc({
        author_name: [authorName],
        language: [],
        number_of_pages_median: undefined,
        title: "",
    });
}

function scoreAuthorOnlyDoc(authorName, query) {
    return scoreDoc(authorOnlyDoc(authorName), query, true);
}

test("normalizeSearchText and queryTokens replace punctuation with spaces and split tokens", () => {
    assert.equal(
        normalizeSearchText("  Ursula, K. Le Guin!  "),
        "ursula  k  le guin",
    );
    assert.deepEqual(queryTokens("Ursula K. Le Guin"), [
        "ursula",
        "k",
        "le",
        "guin",
    ]);
});

test("primaryAuthor returns the first available author name", () => {
    assert.equal(
        primaryAuthor(
            searchDoc({
                author_name: ["Jane Austen", "Ignored Author"],
            }),
        ),
        "Jane Austen",
    );
    assert.equal(primaryAuthor(searchDoc({ author_name: [] })), "");
});

test("hasEnglishLanguage recognizes English language tags", () => {
    assert.equal(hasEnglishLanguage(searchDoc({ language: ["eng"] })), true);
    assert.equal(
        hasEnglishLanguage(searchDoc({ language: ["fr", "en/eng"] })),
        true,
    );
    assert.equal(hasEnglishLanguage(searchDoc({ language: ["fr"] })), false);
});

test("dedupeDocs keeps first-seen docs and falls back to title-author keys", () => {
    const DEDUPED = dedupeDocs(DEDUPE_FIXTURE_DOCS);

    assert.equal(DEDUPED.length, 2);
    assert.equal(DEDUPED[0].title, "Animal Farm");
    assert.equal(DEDUPED[1].title, "Persuasion");
});

test("scoreDoc keeps exact author-only matches above partial matches", () => {
    const EXACT_SCORE = scoreAuthorOnlyDoc("George Orwell", "George Orwell");
    const PARTIAL_SCORE = scoreAuthorOnlyDoc("George Orwell", "George");

    assert.equal(EXACT_SCORE, SCORE_AUTHOR_EXACT);
    assert.ok(PARTIAL_SCORE > 0);
    assert.ok(PARTIAL_SCORE < EXACT_SCORE);
    assert.equal(scoreAuthorOnlyDoc("Jane Austen", "George Orwell"), 0);
});

test("searchUrls normalizes transliterated author aliases for author-only lookups", () => {
    const URLS = searchUrls("Doestoevsky", true);

    assert.ok(
        URLS.some((url) => url.toLowerCase().includes("author=dostoevsky")),
    );
});

test("scoreDoc treats transliterated author aliases as author-only matches", () => {
    const SCORE = scoreAuthorOnlyDoc("Fyodor Dostoevsky", "Doestoevsky");

    assert.ok(SCORE > 0);
});
