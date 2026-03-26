// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { findRecommendations } from "../dist/renderer/recommendations/search.js";

const BASE_BOOK = {
    author: "",
    blocked_by: null,
    book_id: "book-default",
    cover_local_path: "",
    cover_url: "",
    deadline: null,
    difficulty: 3,
    finished_at: null,
    lookup_note: "",
    max_minutes_per_day: null,
    min_blocks_per_session: 1,
    pages_read: null,
    pages_total: null,
    priority: 3,
    progress_percent: 0,
    shelf: "",
    status: "to_read",
    title: "Default Title",
    words_total: 50000,
};

/**
 * Builds a valid book-like test object with optional overrides.
 * @param {Record<string, unknown>} overrides - Partial fixture overrides.
 * @returns {Record<string, unknown>} Book-like fixture object.
 */
function book(overrides = {}) {
    return { ...BASE_BOOK, ...overrides };
}

function createSearchApi(results, calls) {
    return {
        searchBooks(query, authorOnly) {
            calls.push({ authorOnly, query });
            return Promise.resolve(results);
        },
    };
}

function titlesFor(items) {
    return items.map((item) => item.title);
}

function georgeOrwellScenario() {
    return {
        books: [
            book({
                author: "George Orwell",
                status: "read",
                title: "Animal Farm",
            }),
            book({
                author: "George Orwell",
                status: "to_read",
                title: "Homage to Catalonia",
            }),
        ],
        results: [
            {
                author: "George Orwell",
                title: "Homage to Catalonia",
                words_estimate: 73000,
            },
            {
                author: "George Orwell",
                title: "Keep the Aspidistra Flying",
                words_estimate: 89000,
            },
        ],
    };
}

test("findRecommendations queries read authors and filters existing titles", async () => {
    const CALLS = [];
    const SCENARIO = georgeOrwellScenario();
    const RECOMMENDATIONS = await findRecommendations(
        SCENARIO.books,
        createSearchApi(SCENARIO.results, CALLS),
    );
    const TITLES = titlesFor(RECOMMENDATIONS);

    assert.deepEqual(CALLS, [{ authorOnly: true, query: "George Orwell" }]);
    assert.equal(TITLES.includes("Homage to Catalonia"), false);
    assert.equal(TITLES.includes("Keep the Aspidistra Flying"), true);
});

test("findRecommendations samples a random subset of up to five read authors", async () => {
    const CALLS = [];
    const AUTHORS = [
        "Author A",
        "Author B",
        "Author C",
        "Author D",
        "Author E",
        "Author F",
    ];
    await findRecommendations(
        AUTHORS.map((author, index) => {
            return book({ author, status: "read", title: `Book ${index}` });
        }),
        createSearchApi([], CALLS),
        { randomFn: () => 0 },
    );

    assert.equal(CALLS.length, 5);
    assert.deepEqual(
        CALLS.map((entry) => entry.query),
        ["Author B", "Author C", "Author D", "Author E", "Author F"],
    );
});

test("findRecommendations falls back to the static catalog when live searches return nothing", async () => {
    const CALLS = [];
    const RECOMMENDATIONS = await findRecommendations(
        [
            book({
                author: "Toni Morrison",
                status: "read",
                title: "Beloved",
            }),
        ],
        createSearchApi([], CALLS),
    );
    const TITLES = titlesFor(RECOMMENDATIONS);

    assert.deepEqual(CALLS, [{ authorOnly: true, query: "Toni Morrison" }]);
    assert.equal(TITLES.includes("Beloved"), false);
    assert.equal(TITLES.includes("Sula"), true);
});
