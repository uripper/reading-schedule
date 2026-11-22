/** Collections: many-per-book membership, Library filtering, and the toolbar. */
import assert from "node:assert/strict";
import test from "node:test";

import {
    COLLECTION_FILTER_ALL,
    COLLECTION_FILTER_NONE,
    collectionFilterMatches,
    normalizeCollections,
    uniqueCollections,
} from "../dist/renderer/books/collection.js";
import {
    clearBookFilters,
    matchesTitleFilter,
    visibleBooksForView,
} from "../dist/renderer/books/controller_render_helpers.js";
import { toPayloadBook } from "../dist/renderer/books/model-payload.js";
import { metaLabel } from "../dist/renderer/books/presenters.js";
import { ensureBooksToolbarControls } from "../dist/renderer/books/toolbar_dom.js";
import { updateCollectionFilterOptions } from "../dist/renderer/books/toolbar_updates.js";
import { book, LIBRARY } from "./helpers/books-collections.mjs";
import { installFakeDom } from "./helpers/fake-dom.mjs";
import { withSelectSemantics } from "./helpers/fake-select.mjs";

function viewState(collectionFilter) {
    return {
        collectionFilter,
        groupBy: "none",
        shelfFilter: "all",
        sortBy: "title",
        sortDirection: "asc",
        statusFilter: "all",
        titleFilter: "",
    };
}

function visibleIds(collectionFilter) {
    return visibleBooksForView(LIBRARY, viewState(collectionFilter), {}).map(
        (entry) => entry.book_id,
    );
}

test("normalizeCollections trims, drops blanks, dedupes ignoring case, and sorts", () => {
    assert.deepEqual(
        normalizeCollections([" Summer ", "classics", "", "SUMMER", 7, null]),
        ["classics", "Summer"],
    );
    assert.deepEqual(normalizeCollections(undefined), []);
    assert.deepEqual(normalizeCollections("Summer"), []);
});

test("legacy books without collections normalize to an empty list", () => {
    assert.deepEqual(book({ book_id: "legacy" }).collections, []);
});

test("a book keeps several collections alongside its single shelf", () => {
    const SAVED = toPayloadBook(LIBRARY[0]);
    assert.deepEqual(SAVED.collections, ["Classics", "Summer"]);
    assert.equal(SAVED.shelf, "Home");
});

test("uniqueCollections lists each collection once across the library", () => {
    assert.deepEqual(uniqueCollections(LIBRARY), ["Classics", "Summer"]);
});

test("collectionFilterMatches handles all, none, and named collections", () => {
    assert.equal(
        collectionFilterMatches(LIBRARY[2], COLLECTION_FILTER_ALL),
        true,
    );
    assert.equal(
        collectionFilterMatches(LIBRARY[2], COLLECTION_FILTER_NONE),
        true,
    );
    assert.equal(
        collectionFilterMatches(LIBRARY[0], COLLECTION_FILTER_NONE),
        false,
    );
    assert.equal(collectionFilterMatches(LIBRARY[1], "Summer"), true);
    assert.equal(collectionFilterMatches(LIBRARY[1], "Classics"), false);
});

test("Library view filters books by collection", () => {
    assert.deepEqual(visibleIds(COLLECTION_FILTER_ALL), ["a", "b", "c"]);
    assert.deepEqual(visibleIds("Summer"), ["a", "b"]);
    assert.deepEqual(visibleIds("Classics"), ["a"]);
    assert.deepEqual(visibleIds(COLLECTION_FILTER_NONE), ["c"]);
});

test("clearing Library filters resets the collection filter", () => {
    const STATE = viewState("Summer");
    clearBookFilters({ titleFilterInput: null }, STATE);
    assert.equal(STATE.collectionFilter, COLLECTION_FILTER_ALL);
});

test("keyword search matches collection names", () => {
    assert.equal(matchesTitleFilter(LIBRARY[0], "classics"), true);
    assert.equal(matchesTitleFilter(LIBRARY[2], "classics"), false);
});

/** Runs `work` on the toolbar's collection select, starting on a stale value. */
function withToolbarCollectionFilter(work) {
    const DOM = installFakeDom();
    try {
        const { collectionFilterSelect } = ensureBooksToolbarControls(
            DOM.createElement("div"),
        );
        const SELECT = withSelectSemantics(collectionFilterSelect);
        SELECT.value = "stale";
        work(SELECT);
    } finally {
        DOM.restore();
    }
}

test("toolbar lists all, none, and every collection in the filter", () => {
    withToolbarCollectionFilter((select) => {
        const SELECTED = updateCollectionFilterOptions(
            select,
            LIBRARY,
            "Summer",
        );
        assert.equal(SELECTED, "Summer");
        assert.equal(select.value, "Summer");
        assert.deepEqual(
            select.children.map((option) => option.value),
            [
                COLLECTION_FILTER_ALL,
                COLLECTION_FILTER_NONE,
                "Classics",
                "Summer",
            ],
        );
    });
});

test("toolbar collection filter falls back when its collection disappears", () => {
    withToolbarCollectionFilter((select) => {
        const SELECTED = updateCollectionFilterOptions(select, LIBRARY, "Gone");
        assert.equal(SELECTED, COLLECTION_FILTER_ALL);
        assert.equal(select.value, COLLECTION_FILTER_ALL);
    });
});

test("book cards list a book's collections", () => {
    assert.match(metaLabel(LIBRARY[0]), /Collections: Classics, Summer/);
    assert.equal(metaLabel(LIBRARY[2]).includes("Collections"), false);
});
