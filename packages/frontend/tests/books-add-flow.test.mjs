// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Exercises prefilled add-book requests through the normal controller boundary. */
import assert from "node:assert/strict";
import test from "node:test";
import {
    addLibraryBook,
    configureAddBookFlow,
} from "../dist/renderer/books/add-book-flow.js";

function fixture() {
    const ELEMENT = new EventTarget();
    ELEMENT.open = false;
    const STATE = { book: null, draft: null };
    configureAddBookFlow({
        element: ELEMENT,
        getBook: (id) => {
            if (STATE.book?.book_id === id) {
                return STATE.book;
            }
            return null;
        },
        getDialog: () => ({
            open: (_book, options) => {
                STATE.draft = options.initialBook;
            },
        }),
    });
    return { element: ELEMENT, state: STATE };
}

test("opens Add Book with source title and progress, then resolves the saved book", async () => {
    const { element: ELEMENT, state: STATE } = fixture();
    const PENDING = addLibraryBook({
        progress_percent: 100,
        title: "A Shining",
    });
    assert.equal(STATE.draft.title, "A Shining");
    assert.equal(STATE.draft.progress_percent, 100);
    STATE.book = { ...STATE.draft, author: "Saved author" };
    ELEMENT.dispatchEvent(new Event("close"));
    assert.equal(await PENDING, STATE.book);
});

test("cancelling the normal form returns no book", async () => {
    const { element: ELEMENT } = fixture();
    const PENDING = addLibraryBook({ title: "Cancelled" });
    ELEMENT.dispatchEvent(new Event("close"));
    assert.equal(await PENDING, null);
});

test("an already open form produces an actionable error", async () => {
    const { element: ELEMENT } = fixture();
    ELEMENT.open = true;
    await assert.rejects(addLibraryBook({ title: "Other" }), /already open/);
});
