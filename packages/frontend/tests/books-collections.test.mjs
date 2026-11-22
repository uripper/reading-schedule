/** Collections: many-per-book membership, Library filtering, and form toggles. */
import assert from "node:assert/strict";
import test from "node:test";

import {
    COLLECTION_FILTER_ALL,
    COLLECTION_FILTER_NONE,
    collectionFilterMatches,
    normalizeCollections,
    uniqueCollections,
} from "../dist/renderer/books/collection.js";
import { collectionOptions } from "../dist/renderer/books/collection_options.js";
import {
    readCollectionSelection,
    renderCollectionPicker,
} from "../dist/renderer/books/collection_picker.js";
import { bindCollectionPicker } from "../dist/renderer/books/collection_picker_bindings.js";
import {
    clearBookFilters,
    matchesTitleFilter,
    visibleBooksForView,
} from "../dist/renderer/books/controller_render_helpers.js";
import { defaultCollectionForAddDialog } from "../dist/renderer/books/controller_types.js";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { toPayloadBook } from "../dist/renderer/books/model-payload.js";
import { metaLabel } from "../dist/renderer/books/presenters.js";
import { ensureBooksToolbarControls } from "../dist/renderer/books/toolbar_dom.js";
import { updateCollectionFilterOptions } from "../dist/renderer/books/toolbar_updates.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

function book(overrides = {}) {
    return normalizeBook({
        book_id: overrides.book_id ?? "book",
        title: overrides.title ?? "A Book",
        words_total: 1000,
        ...overrides,
    });
}

const LIBRARY = [
    book({ book_id: "a", collections: ["Classics", "Summer"], shelf: "Home" }),
    book({ book_id: "b", collections: ["summer"], shelf: "Home" }),
    book({ book_id: "c", shelf: "Work" }),
];

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

test("new books join the collection the Library is filtered to", () => {
    assert.equal(defaultCollectionForAddDialog("Summer"), "Summer");
    assert.equal(defaultCollectionForAddDialog(COLLECTION_FILTER_ALL), "");
    assert.equal(defaultCollectionForAddDialog(COLLECTION_FILTER_NONE), "");
});

function withToolbarCollectionFilter(work) {
    const DOM = installFakeDom();
    try {
        const { collectionFilterSelect } = ensureBooksToolbarControls(
            DOM.createElement("div"),
        );
        work(collectionFilterSelect);
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
    });
});

function collectionRefs(dom) {
    const REFS = {
        collectionChips: dom.createElement("div"),
        collectionInput: dom.createElement("input"),
        collectionResults: dom.createElement("div"),
    };
    bindCollectionPicker(REFS);
    return REFS;
}

function withCollectionPicker(selected, work) {
    const DOM = installFakeDom();
    try {
        const REFS = collectionRefs(DOM);
        renderCollectionPicker(REFS, LIBRARY, selected);
        work(REFS);
    } finally {
        DOM.restore();
    }
}

function press(refs, key) {
    return refs.collectionInput.dispatch("keydown", {
        key,
        stopPropagation() {},
    });
}

function typeAndPress(refs, text, key) {
    refs.collectionInput.value = text;
    refs.collectionInput.dispatch("input");
    return press(refs, key);
}

function optionLabels(refs) {
    return refs.collectionResults.children.map((option) => option.textContent);
}

test("collection search lists unchosen matches and offers to create new names", () => {
    const AVAILABLE = ["Classics", "Summer"];
    assert.deepEqual(collectionOptions(AVAILABLE, ["Summer"], ""), [
        { isNew: false, name: "Classics" },
    ]);
    assert.deepEqual(collectionOptions(AVAILABLE, [], "SUM"), [
        { isNew: false, name: "Summer" },
        { isNew: true, name: "SUM" },
    ]);
    assert.deepEqual(collectionOptions(AVAILABLE, [], " summer "), [
        { isNew: false, name: "Summer" },
    ]);
    assert.deepEqual(collectionOptions(AVAILABLE, ["Summer"], "summer"), []);
});

test("the book's collections show as chips and are what the form saves", () => {
    withCollectionPicker(["summer", "Road Trip"], (refs) => {
        assert.deepEqual(readCollectionSelection(refs), [
            "Road Trip",
            "summer",
        ]);
        assert.equal(refs.collectionChips.children.length, 2);
        assert.equal(
            refs.collectionInput.getAttribute("aria-expanded"),
            "false",
        );
    });
});

test("focusing the search opens every collection the book is not in", () => {
    withCollectionPicker(["Summer"], (refs) => {
        refs.collectionInput.dispatch("focus");
        assert.deepEqual(optionLabels(refs), ["Classics"]);
        assert.equal(
            refs.collectionInput.getAttribute("aria-expanded"),
            "true",
        );
    });
});

test("Enter adds the first match, keeping the library's spelling", () => {
    withCollectionPicker([], (refs) => {
        const EVENT = typeAndPress(refs, "summ", "Enter");
        assert.equal(EVENT.defaultPrevented, true);
        assert.deepEqual(readCollectionSelection(refs), ["Summer"]);
        assert.equal(refs.collectionInput.value, "");
        assert.deepEqual(optionLabels(refs), ["Classics"]);
    });
});

test("typing a new name and pressing Enter creates the collection", () => {
    withCollectionPicker(["Summer"], (refs) => {
        refs.collectionInput.value = "Poetry";
        refs.collectionInput.dispatch("input");
        assert.deepEqual(optionLabels(refs), ['Create "Poetry"']);
        typeAndPress(refs, "Poetry", "Enter");
        assert.deepEqual(readCollectionSelection(refs), ["Poetry", "Summer"]);
    });
});

test("arrow keys pick an option and clicking an option adds it", () => {
    withCollectionPicker([], (refs) => {
        press(refs, "ArrowDown");
        press(refs, "ArrowDown");
        assert.equal(
            refs.collectionInput.getAttribute("aria-activedescendant"),
            "book-collection-option-1",
        );
        refs.collectionResults.dispatch("click", {
            target: refs.collectionResults.children[0],
        });
        assert.deepEqual(readCollectionSelection(refs), ["Classics"]);
    });
});

test("chips and Backspace remove collections; Escape only closes the list", () => {
    withCollectionPicker(["Classics", "Summer"], (refs) => {
        refs.collectionChips.dispatch("click", {
            target: refs.collectionChips.children[0],
        });
        assert.deepEqual(readCollectionSelection(refs), ["Summer"]);
        typeAndPress(refs, "", "Backspace");
        assert.deepEqual(readCollectionSelection(refs), []);
        refs.collectionInput.dispatch("focus");
        const EVENT = typeAndPress(refs, "", "Escape");
        assert.equal(EVENT.defaultPrevented, true);
        assert.equal(
            refs.collectionInput.getAttribute("aria-expanded"),
            "false",
        );
    });
});

test("book cards list a book's collections", () => {
    assert.match(metaLabel(LIBRARY[0]), /Collections: Classics, Summer/);
    assert.equal(metaLabel(LIBRARY[2]).includes("Collections"), false);
});
