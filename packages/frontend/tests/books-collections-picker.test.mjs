/** Collections: the book form's search-and-chips collection picker. */
import assert from "node:assert/strict";
import test from "node:test";

import { collectionOptions } from "../dist/renderer/books/collection_options.js";
import {
    readCollectionSelection,
    renderCollectionPicker,
} from "../dist/renderer/books/collection_picker.js";
import { bindCollectionPicker } from "../dist/renderer/books/collection_picker_bindings.js";
import { parseFormBook } from "../dist/renderer/books/form-state.js";
import { LIBRARY } from "./helpers/books-collections.mjs";
import { createRefs } from "./helpers/books-dialog-submit.mjs";
import { installFakeDom } from "./helpers/fake-dom.mjs";

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
        const FORM_REFS = createRefs(null, {
            collectionChips: refs.collectionChips,
        });
        assert.deepEqual(parseFormBook(FORM_REFS).collections, [
            "Road Trip",
            "summer",
        ]);
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

function activeOption(refs) {
    return refs.collectionInput.getAttribute("aria-activedescendant");
}

test("Enter adds the option highlighted with the arrow keys", () => {
    withCollectionPicker([], (refs) => {
        press(refs, "ArrowDown");
        press(refs, "ArrowDown");
        assert.equal(activeOption(refs), "book-collection-option-1");
        press(refs, "Enter");
        assert.deepEqual(readCollectionSelection(refs), ["Summer"]);
    });
});

test("Arrow Up with nothing highlighted lands on the last option", () => {
    withCollectionPicker([], (refs) => {
        refs.collectionInput.dispatch("focus");
        press(refs, "ArrowUp");
        assert.equal(activeOption(refs), "book-collection-option-1");
    });
});

test("Arrow Down reopening a search keeps the top suggestion highlighted", () => {
    withCollectionPicker([], (refs) => {
        typeAndPress(refs, "s", "Escape");
        press(refs, "ArrowDown");
        assert.equal(activeOption(refs), "book-collection-option-0");
    });
});

test("clicking an option adds it", () => {
    withCollectionPicker([], (refs) => {
        refs.collectionInput.dispatch("focus");
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
