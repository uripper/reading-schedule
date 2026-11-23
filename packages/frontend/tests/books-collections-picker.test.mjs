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

const NEW_ROW = "New collection…";

function optionLabels(refs) {
    return refs.collectionResults.children.map(
        (option) => option.dataset.optionLabel,
    );
}

function selectedLabels(refs) {
    return refs.collectionResults.children
        .filter((option) => option.getAttribute("aria-selected") === "true")
        .map((option) => option.dataset.optionLabel);
}

function row(name, selected = false, match = null) {
    return { kind: "existing", match, name, selected };
}

function action(kind, name = "") {
    return { kind, match: null, name, selected: false };
}

test("collection search keeps chosen rows, marks them, and ends with explicit create rows", () => {
    const AVAILABLE = ["Classics", "Summer"];
    assert.deepEqual(collectionOptions(AVAILABLE, ["Summer"], ""), [
        row("Classics"),
        row("Summer", true),
        action("new"),
    ]);
    assert.deepEqual(collectionOptions(AVAILABLE, [], "SUM"), [
        row("Summer", false, { end: 3, start: 0 }),
        action("create", "SUM"),
        action("new"),
    ]);
    assert.deepEqual(collectionOptions(AVAILABLE, [], " summer "), [
        row("Summer", false, { end: 6, start: 0 }),
        action("new"),
    ]);
});

test("word-start matches rank before matches inside a word", () => {
    const OPTIONS = collectionOptions(
        ["Gardening", "Dening Notes", "Zen"],
        [],
        "den",
    );
    assert.deepEqual(
        OPTIONS.filter((option) => option.kind === "existing").map((option) => [
            option.name,
            option.match,
        ]),
        [
            ["Dening Notes", { end: 3, start: 0 }],
            ["Gardening", { end: 6, start: 3 }],
        ],
    );
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

test("focusing the search lists every collection with the chosen ones checked", () => {
    withCollectionPicker(["Summer"], (refs) => {
        refs.collectionInput.dispatch("focus");
        assert.deepEqual(optionLabels(refs), ["Classics", "Summer", NEW_ROW]);
        assert.deepEqual(selectedLabels(refs), ["Summer"]);
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
        assert.deepEqual(selectedLabels(refs), ["Summer"]);
    });
});

test("choosing a chosen collection again removes it", () => {
    withCollectionPicker(["Summer"], (refs) => {
        typeAndPress(refs, "summ", "Enter");
        assert.deepEqual(readCollectionSelection(refs), []);
    });
});

test("typing a new name offers Create and Enter creates and selects it", () => {
    withCollectionPicker(["Summer"], (refs) => {
        refs.collectionInput.value = "Poetry";
        refs.collectionInput.dispatch("input");
        assert.deepEqual(optionLabels(refs), ['Create "Poetry"', NEW_ROW]);
        typeAndPress(refs, "Poetry", "Enter");
        assert.deepEqual(readCollectionSelection(refs), ["Poetry", "Summer"]);
    });
});

test("New collection… with nothing typed asks for a name, then Enter creates it", () => {
    withCollectionPicker([], (refs) => {
        refs.collectionInput.dispatch("focus");
        press(refs, "ArrowUp");
        press(refs, "Enter");
        assert.match(
            refs.collectionInput.placeholder,
            /Name the new collection/u,
        );
        typeAndPress(refs, "Poetry", "Enter");
        assert.deepEqual(readCollectionSelection(refs), ["Poetry"]);
        assert.doesNotMatch(refs.collectionInput.placeholder, /Name the new/u);
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

test("Arrow Up with nothing highlighted lands on the pinned last row", () => {
    withCollectionPicker([], (refs) => {
        refs.collectionInput.dispatch("focus");
        press(refs, "ArrowUp");
        assert.equal(activeOption(refs), "book-collection-option-2");
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

test("leaving the field closes the menu", () => {
    withCollectionPicker([], (refs) => {
        refs.collectionInput.dispatch("focus");
        refs.collectionInput.dispatch("blur");
        assert.equal(
            refs.collectionInput.getAttribute("aria-expanded"),
            "false",
        );
    });
});
