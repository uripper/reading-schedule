/** Collections: books added while the Library is filtered join that collection. */
import assert from "node:assert/strict";
import test from "node:test";

import {
    COLLECTION_FILTER_ALL,
    COLLECTION_FILTER_NONE,
} from "../dist/renderer/books/collection.js";
import { readCollectionSelection } from "../dist/renderer/books/collection_picker.js";
import { bindBooksUI, fillBooks } from "../dist/renderer/books/controller.js";
import { defaultCollectionForAddDialog } from "../dist/renderer/books/controller_types.js";
import { LIBRARY } from "./helpers/books-collections.mjs";
import { installLibraryDom } from "./helpers/books-library-dom.mjs";

/** Filters the Library by `collectionFilter`, clicks Add, and reads the form. */
function addDialogCollections(dom, collectionFilter) {
    const SELECT = dom.document.getElementById("booksCollectionFilterSelect");
    SELECT.value = collectionFilter;
    SELECT.dispatch("change");
    dom.document.getElementById("addBookBtn").click();
    return readCollectionSelection({
        collectionChips: dom.document.getElementById("bookCollectionChips"),
    });
}

test("new books join the collection the Library is filtered to", () => {
    assert.equal(defaultCollectionForAddDialog("Summer"), "Summer");
    assert.equal(defaultCollectionForAddDialog(COLLECTION_FILTER_ALL), "");
    assert.equal(defaultCollectionForAddDialog(COLLECTION_FILTER_NONE), "");
});

test("the Add button opens the form with the filtered collection chosen", () => {
    const DOM = installLibraryDom();
    try {
        fillBooks(LIBRARY);
        bindBooksUI();
        assert.deepEqual(addDialogCollections(DOM, "Summer"), ["Summer"]);
        assert.deepEqual(addDialogCollections(DOM, "Classics"), ["Classics"]);
        assert.deepEqual(addDialogCollections(DOM, COLLECTION_FILTER_NONE), []);
        assert.deepEqual(addDialogCollections(DOM, COLLECTION_FILTER_ALL), []);
    } finally {
        DOM.restore();
    }
});
