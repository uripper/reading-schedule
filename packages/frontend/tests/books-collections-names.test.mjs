/** Collection names: reserved filter sentinels and accent-folded search. */
import assert from "node:assert/strict";
import test from "node:test";

import {
    COLLECTION_FILTER_ALL,
    COLLECTION_FILTER_NONE,
    collectionFilterMatches,
    foldCollectionName,
    normalizeCollectionName,
    normalizeCollections,
} from "../dist/renderer/books/collection.js";
import { collectionOptions } from "../dist/renderer/books/collection_options.js";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { collectionFilterOptions } from "../dist/renderer/books/toolbar_options.js";

const SENTINELS = [COLLECTION_FILTER_ALL, COLLECTION_FILTER_NONE];

test("filter sentinels are rejected as collection names", () => {
    for (const SENTINEL of SENTINELS) {
        assert.equal(normalizeCollectionName(SENTINEL), "");
        assert.equal(normalizeCollectionName(`  ${SENTINEL} `), "");
        assert.equal(normalizeCollectionName(SENTINEL.toUpperCase()), "");
    }
    assert.deepEqual(normalizeCollections([...SENTINELS, "Classics"]), [
        "Classics",
    ]);
});

test("imported books drop sentinel collections before the toolbar sees them", () => {
    const BOOK = normalizeBook({
        book_id: "imported",
        collections: [COLLECTION_FILTER_NONE, "Summer"],
        title: "Imported",
        words_total: 1000,
    });
    assert.deepEqual(BOOK.collections, ["Summer"]);
    const VALUES = collectionFilterOptions([BOOK]).map(
        (option) => option.value,
    );
    assert.deepEqual(VALUES, [
        COLLECTION_FILTER_ALL,
        COLLECTION_FILTER_NONE,
        "Summer",
    ]);
    assert.equal(collectionFilterMatches(BOOK, COLLECTION_FILTER_NONE), false);
});

test("collection picker never offers to create a sentinel name", () => {
    for (const SENTINEL of SENTINELS) {
        const OPTIONS = collectionOptions(["Classics"], [], SENTINEL);
        assert.equal(
            OPTIONS.some((option) => option.isNew),
            false,
        );
    }
});

test("folding drops case and accents", () => {
    assert.equal(foldCollectionName("CAFÉ"), "cafe");
    assert.equal(foldCollectionName("Café"), foldCollectionName("cafe"));
});

test("collection search ignores accents and case like name comparison", () => {
    assert.deepEqual(collectionOptions(["Café"], [], "cafe"), [
        { isNew: false, name: "Café" },
    ]);
    assert.deepEqual(collectionOptions(["cafe"], [], "CAFÉ"), [
        { isNew: false, name: "cafe" },
    ]);
    assert.deepEqual(collectionOptions(["Café", "Summer"], [], "caf"), [
        { isNew: false, name: "Café" },
        { isNew: true, name: "caf" },
    ]);
});
