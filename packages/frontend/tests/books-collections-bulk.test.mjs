/** Mass edit adds and removes collections on every selected book. */
import assert from "node:assert/strict";
import test from "node:test";

import { createBulkBookSubmitPayload } from "../dist/renderer/books/bulk-edit-form.js";
import {
    collectionChanges,
    sharedCollections,
    withCollectionChanges,
} from "../dist/renderer/books/collection_bulk.js";
import {
    addCollectionToForm,
    removeCollectionFromForm,
    renderCollectionPicker,
} from "../dist/renderer/books/collection_picker.js";
import { nextBooksAfterDialogSave } from "../dist/renderer/books/controller-save.js";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const BULK_FIELDS = [
    "afterBookInput",
    "author",
    "blockedByInput",
    "deadlineInput",
    "difficultyInput",
    "finishedAtInput",
    "maxMinutesInput",
    "pagesReadInput",
    "pagesTotalInput",
    "priorityInput",
    "progressInput",
    "scheduledDaysField",
    "shelfSelectInput",
    "statusSelectInput",
    "wordsInput",
];

function book(bookId, collections) {
    return normalizeBook({
        book_id: bookId,
        collections,
        title: bookId,
        words_total: 1000,
    });
}

const LIBRARY = [
    book("a", ["Classics", "Summer"]),
    book("b", ["summer", "Poetry"]),
    book("c", ["Classics"]),
];

function cleanBulkRefs(dom) {
    const REFS = {
        collectionChips: dom.createElement("div"),
        collectionInput: dom.createElement("input"),
        collectionResults: dom.createElement("div"),
    };
    for (const FIELD of BULK_FIELDS) {
        REFS[FIELD] = { dataset: {} };
    }
    return REFS;
}

function savedCollections(books) {
    return Object.fromEntries(
        books.map((entry) => [entry.book_id, entry.collections]),
    );
}

test("mass edit shows only collections every selected book shares", () => {
    assert.deepEqual(sharedCollections(LIBRARY.slice(0, 2)), ["Summer"]);
    assert.deepEqual(sharedCollections(LIBRARY), []);
    assert.deepEqual(sharedCollections([]), []);
});

test("collection changes list what was added and removed, ignoring case", () => {
    assert.equal(collectionChanges(["Summer"], ["summer"]), null);
    assert.deepEqual(collectionChanges(["Summer"], ["Poetry"]), {
        added: ["Poetry"],
        removed: ["Summer"],
    });
});

test("changes keep a book's other collections", () => {
    const CHANGES = { added: ["Travel"], removed: ["summer"] };
    assert.deepEqual(withCollectionChanges(["Poetry", "Summer"], CHANGES), [
        "Poetry",
        "Travel",
    ]);
});

test("a collections-only mass edit saves to every selected book", () => {
    const DOM = installFakeDom();
    try {
        const REFS = cleanBulkRefs(DOM);
        renderCollectionPicker(
            REFS,
            LIBRARY,
            sharedCollections(LIBRARY.slice(0, 2)),
        );
        addCollectionToForm(REFS, "Travel");
        removeCollectionFromForm(REFS, "Summer");
        const PAYLOAD = createBulkBookSubmitPayload(REFS, ["a", "b"]);
        assert.deepEqual(PAYLOAD.updates, {});
        assert.deepEqual(
            savedCollections(nextBooksAfterDialogSave(LIBRARY, PAYLOAD)),
            {
                a: ["Classics", "Travel"],
                b: ["Poetry", "Travel"],
                c: ["Classics"],
            },
        );
    } finally {
        DOM.restore();
    }
});

test("an untouched collections field leaves mass-edited books' collections alone", () => {
    const DOM = installFakeDom();
    try {
        const REFS = cleanBulkRefs(DOM);
        renderCollectionPicker(REFS, LIBRARY, sharedCollections(LIBRARY));
        const PAYLOAD = createBulkBookSubmitPayload(REFS, ["a", "b", "c"]);
        assert.equal(PAYLOAD.collectionChanges, undefined);
        assert.equal(nextBooksAfterDialogSave(LIBRARY, PAYLOAD), LIBRARY);
    } finally {
        DOM.restore();
    }
});
