import assert from "node:assert/strict";
import test from "node:test";

import { findRecommendations } from "../dist/renderer/recommendations/search.js";

/**
 * Builds a valid book-like test object with optional overrides.
 * @param {Record<string, unknown>} overrides Partial fixture overrides.
 * @returns {Record<string, unknown>} Book-like fixture object.
 */
function book(overrides = {}) {
    return {
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
        ...overrides,
    };
}

test("findRecommendations queries read authors and filters existing titles", async () => {
    const CALLS = [];
    const API = {
        searchBooks(query, authorOnly) {
            CALLS.push({ authorOnly, query });
            return Promise.resolve([
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
            ]);
        },
    };

    const RECOMMENDATIONS = await findRecommendations(
        [
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
        API,
    );

    assert.equal(CALLS[0].query, "George Orwell");
    assert.equal(CALLS[0].authorOnly, true);
    assert.equal(
        RECOMMENDATIONS.some((item) => item.title === "Homage to Catalonia"),
        false,
    );
    assert.equal(
        RECOMMENDATIONS.some(
            (item) => item.title === "Keep the Aspidistra Flying",
        ),
        true,
    );
});

test("findRecommendations samples a random subset of up to five read authors", async () => {
    const CALLS = [];
    const API = {
        searchBooks(query) {
            CALLS.push(query);
            return Promise.resolve([]);
        },
    };

    await findRecommendations(
        [
            book({ author: "Author A", status: "read", title: "Book A" }),
            book({ author: "Author B", status: "read", title: "Book B" }),
            book({ author: "Author C", status: "read", title: "Book C" }),
            book({ author: "Author D", status: "read", title: "Book D" }),
            book({ author: "Author E", status: "read", title: "Book E" }),
            book({ author: "Author F", status: "read", title: "Book F" }),
        ],
        API,
        { randomFn: () => 0 },
    );

    assert.equal(CALLS.length, 5);
    assert.deepEqual(CALLS, [
        "Author B",
        "Author C",
        "Author D",
        "Author E",
        "Author F",
    ]);
});
