// biome-ignore-all lint/correctness/noUnresolvedImports: tests exercise built frontend artifacts.
/** Verifies dialog errors retain entered data, survive lookup updates, and recover. */
import assert from "node:assert/strict";
import test from "node:test";
import {
    bindBookDialogSubmit,
    resetBookDialogSubmitState,
    showSubmitError,
} from "../dist/renderer/books/dialog_submit.js";
import { BOOK_SAVE_FAILURE_MESSAGE } from "../dist/renderer/errors/index.js";
import {
    createRefs,
    fakeFormElement,
    flushMicrotasks,
} from "./helpers/books-dialog-submit.mjs";

test("save errors keep entries and focus and cannot be overwritten by lookup feedback", () => {
    const REFS = createRefs(new fakeFormElement());
    showSubmitError(REFS, new Error("Private filesystem detail"), false);
    REFS.lookupMeta.textContent = "Lookup updated";
    assert.equal(REFS.submitError.textContent, BOOK_SAVE_FAILURE_MESSAGE);
    assert.equal(REFS.titleInput.value, "A Book");
    assert.equal(REFS.author.value, "Author");
    assert.equal(REFS.titleInput.focusCalls, 0);
    assert.equal(REFS.submitError.textContent.includes("filesystem"), false);
});

function firstSaveFails() {
    let attempts = 0;
    return () => {
        attempts += 1;
        if (attempts === 1) {
            return Promise.reject(new Error("Failed save"));
        }
        return Promise.resolve();
    };
}

test("a successful retry completes once and opening a new dialog clears its error", async () => {
    const FORM = new fakeFormElement();
    const REFS = createRefs(FORM);
    let completions = 0;
    bindBookDialogSubmit({
        createPayload: () => ({
            book: { book_id: "book-1", title: REFS.titleInput.value },
        }),
        form: FORM,
        onComplete: () => {
            completions += 1;
        },
        onSubmit: firstSaveFails(),
        refs: REFS,
    });
    FORM.submit();
    await flushMicrotasks();
    assert.equal(completions, 0);
    assert.equal(REFS.submitError.textContent, BOOK_SAVE_FAILURE_MESSAGE);
    FORM.submit();
    await flushMicrotasks();
    assert.equal(completions, 1);
    resetBookDialogSubmitState(REFS);
    assert.equal(REFS.submitError.textContent, "");
});
