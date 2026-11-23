/** Edit dialog Remove book action: confirmation, removal, and closing. */
import assert from "node:assert/strict";
import test from "node:test";

import { bindBookDialogRemove } from "../dist/renderer/books/dialog_remove.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const BOOK_ID = "book-1";

function flushPromises() {
    return new Promise((resolve) => {
        setImmediate(resolve);
    });
}

/** Binds the Remove button with a scripted confirmation answer. */
function bindRemove(environment, confirmed) {
    const BUTTON = environment.createElement("button", "removeBookBtn");
    environment.document.body.append(BUTTON);
    const CALLS = { closed: 0, removed: [] };
    bindBookDialogRemove(
        { bookId: { value: ` ${BOOK_ID} ` } },
        (bookId) => {
            CALLS.removed.push(bookId);
            return Promise.resolve(confirmed);
        },
        () => {
            CALLS.closed += 1;
        },
    );
    return { BUTTON, CALLS };
}

test("cancelling the removal keeps the dialog open", async () => {
    const ENVIRONMENT = installFakeDom();
    try {
        const { BUTTON, CALLS } = bindRemove(ENVIRONMENT, false);
        BUTTON.click();
        await flushPromises();
        assert.deepEqual(CALLS.removed, [BOOK_ID]);
        assert.equal(CALLS.closed, 0);
    } finally {
        ENVIRONMENT.restore();
    }
});

test("a confirmed removal closes the dialog", async () => {
    const ENVIRONMENT = installFakeDom();
    try {
        const { BUTTON, CALLS } = bindRemove(ENVIRONMENT, true);
        BUTTON.click();
        await flushPromises();
        assert.deepEqual(CALLS.removed, [BOOK_ID]);
        assert.equal(CALLS.closed, 1);
    } finally {
        ENVIRONMENT.restore();
    }
});
