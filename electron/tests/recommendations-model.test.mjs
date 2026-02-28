import assert from "node:assert/strict";
import test from "node:test";

import {
	buildRecommendations,
	deriveReadAuthors,
} from "../dist/renderer/recommendations/model.js";

/**
 * Builds a valid book-like test object with optional overrides.
 * @param {Record<string, unknown>} overrides Partial fields to override in the default book fixture.
 * @returns {Record<string, unknown>} Normalized test-book object.
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

test("deriveReadAuthors deduplicates and sorts read authors", () => {
	const authors = deriveReadAuthors([
		book({ author: "George Orwell", status: "read" }),
		book({ author: "jane austen", progress_percent: 100 }),
		book({ author: "Jane Austen", status: "in_progress" }),
		book({ author: "  " }),
	]);

	assert.deepEqual(authors, ["George Orwell", "jane austen"]);
});

test("buildRecommendations excludes books already in the shelf", () => {
	const recommendations = buildRecommendations([
		book({ author: "George Orwell", status: "read", title: "Animal Farm" }),
		book({
			author: "George Orwell",
			status: "to_read",
			title: "Homage to Catalonia",
		}),
	]);

	const titles = recommendations.map((item) => {
		return item.title;
	});

	assert.equal(titles.includes("Homage to Catalonia"), false);
	assert.equal(titles.includes("Keep the Aspidistra Flying"), true);
});
