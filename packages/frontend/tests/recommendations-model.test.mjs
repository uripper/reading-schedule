// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    buildRecommendations,
    deriveReadAuthors,
} from "../dist/renderer/recommendations/model.js";

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
 * @param {Record<string, unknown>} overrides - Partial fields to override in the default book fixture.
 * @returns {Record<string, unknown>} Normalized test-book object.
 */
function book(overrides = {}) {
    return {
        ...BASE_BOOK,
        ...overrides,
    };
}

test("deriveReadAuthors deduplicates and sorts read authors", () => {
    const AUTHORS = deriveReadAuthors([
        book({ author: "George Orwell", status: "read" }),
        book({ author: "jane austen", progress_percent: 100 }),
        book({ author: "Jane Austen", status: "in_progress" }),
        book({ author: "  " }),
    ]);

    assert.deepEqual(AUTHORS, ["George Orwell", "jane austen"]);
});

test("buildRecommendations excludes books already in the shelf", () => {
    const RECOMMENDATIONS = buildRecommendations([
        book({ author: "George Orwell", status: "read", title: "Animal Farm" }),
        book({
            author: "George Orwell",
            status: "to_read",
            title: "Homage to Catalonia",
        }),
    ]);

    const TITLES = RECOMMENDATIONS.map((item) => {
        return item.title;
    });

    assert.equal(TITLES.includes("Homage to Catalonia"), false);
    assert.equal(TITLES.includes("Keep the Aspidistra Flying"), true);
});
