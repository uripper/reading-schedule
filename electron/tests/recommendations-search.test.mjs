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
        book_id: "book-default",
        title: "Default Title",
        author: "",
        words_total: 50000,
        pages_total: null,
        pages_read: null,
        progress_percent: 0,
        priority: 3,
        difficulty: 3,
        min_blocks_per_session: 1,
        max_minutes_per_day: null,
        deadline: null,
        blocked_by: null,
        shelf: "",
        status: "to_read",
        finished_at: null,
        cover_url: "",
        cover_local_path: "",
        lookup_note: "",
        ...overrides,
    };
}

test("findRecommendations queries read authors and filters existing titles", async () => {
    const calls = [];
    const api = {
        searchBooks(query, authorOnly) {
            calls.push({ query, authorOnly });
            return Promise.resolve([
                {
                    title: "Homage to Catalonia",
                    author: "George Orwell",
                    words_estimate: 73000,
                },
                {
                    title: "Keep the Aspidistra Flying",
                    author: "George Orwell",
                    words_estimate: 89000,
                },
            ]);
        },
    };

    const recommendations = await findRecommendations(
        [
            book({
                title: "Animal Farm",
                author: "George Orwell",
                status: "read",
            }),
            book({
                title: "Homage to Catalonia",
                author: "George Orwell",
                status: "to_read",
            }),
        ],
        api,
    );

    assert.equal(calls[0].query, "George Orwell");
    assert.equal(calls[0].authorOnly, true);
    assert.equal(
        recommendations.some((item) => item.title === "Homage to Catalonia"),
        false,
    );
    assert.equal(
        recommendations.some(
            (item) => item.title === "Keep the Aspidistra Flying",
        ),
        true,
    );
});

test("findRecommendations samples a random subset of up to five read authors", async () => {
    const calls = [];
    const api = {
        searchBooks(query) {
            calls.push(query);
            return Promise.resolve([]);
        },
    };

    await findRecommendations(
        [
            book({ title: "Book A", author: "Author A", status: "read" }),
            book({ title: "Book B", author: "Author B", status: "read" }),
            book({ title: "Book C", author: "Author C", status: "read" }),
            book({ title: "Book D", author: "Author D", status: "read" }),
            book({ title: "Book E", author: "Author E", status: "read" }),
            book({ title: "Book F", author: "Author F", status: "read" }),
        ],
        api,
        { randomFn: () => 0 },
    );

    assert.equal(calls.length, 5);
    assert.deepEqual(calls, [
        "Author B",
        "Author C",
        "Author D",
        "Author E",
        "Author F",
    ]);
});
