// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { recommendationKey } from "../dist/renderer/recommendations/search_matchers.js";
import {
    pickRandomSample,
    processAuthorResults,
    sampleResultsSummary,
} from "../dist/renderer/recommendations/search_processing.js";

/**
 * Builds a recommendation lookup item fixture.
 * @param {string} title - Lookup title.
 * @param {string} author - Lookup author.
 * @returns {Record<string, unknown>} Lookup item fixture.
 */
function lookupItem(title, author) {
    return {
        author,
        cover_url: "",
        pages_estimate: 200,
        title,
    };
}

function authorLookupItems() {
    return [
        lookupItem("Existing Title", "George Orwell"),
        lookupItem("Homage to Catalonia", "George Orwell"),
        lookupItem("Keep the Aspidistra Flying", "George Orwell"),
        lookupItem("Animal Farm", "George Orwell"),
        lookupItem("1984", "George Orwell"),
        lookupItem("Animal Farm", "George Orwell"),
    ];
}

function authorResultsState() {
    return {
        existingKeys: new Set([
            recommendationKey("Existing Title", "George Orwell"),
        ]),
        recommendationKeys: new Set(),
        recommendations: [],
    };
}

test("sampleResultsSummary previews the first three lookup results", () => {
    assert.equal(
        sampleResultsSummary([
            lookupItem("Book One", "Author A"),
            lookupItem("Book Two", "Author B"),
            lookupItem("Book Three", "Author C"),
            lookupItem("Book Four", "Author D"),
        ]),
        '"Book One" by Author A, "Book Two" by Author B, "Book Three" by Author C',
    );
});

test("pickRandomSample preserves order when the shuffle source does not swap", () => {
    assert.deepEqual(
        pickRandomSample(["a", "b", "c"], 2, () => 0.999),
        ["a", "b"],
    );
    assert.deepEqual(
        pickRandomSample(["a", "b", "c"], 0, () => 0.999),
        [],
    );
});

test("processAuthorResults keeps unique author matches up to the author cap", () => {
    const STATE = authorResultsState();

    const ADDED = processAuthorResults({
        author: "George Orwell",
        existingKeys: STATE.existingKeys,
        lookupItems: authorLookupItems(),
        recommendationKeys: STATE.recommendationKeys,
        recommendations: STATE.recommendations,
    });

    assert.equal(ADDED, 3);
    assert.deepEqual(
        STATE.recommendations.map((item) => item.title),
        ["Homage to Catalonia", "Keep the Aspidistra Flying", "Animal Farm"],
    );
    assert.equal(STATE.recommendationKeys.size, 3);
});
