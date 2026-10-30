// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
/**
 * Regression test for book dialog submit recovery after sync validation failures.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { bindBookDialogSubmit } from "../dist/renderer/books/dialog_submit.js";

import {
    createLookupMeta,
    createRefs,
    createSaveButton,
    fakeFormElement,
    fakeHtmlElement,
    fakeInput,
    flushMicrotasks,
    withFakeHtmlElement,
} from "./helpers/books-dialog-submit.mjs";

const NOOP = () => undefined;

function createValidationFailureContext() {
    return {
        completeCalls: 0,
        form: new fakeFormElement(),
        lookupMeta: createLookupMeta(),
        pagesTotalInput: fakeInput(""),
        saveButton: createSaveButton(),
        submitCalls: 0,
        submitError: createLookupMeta(),
        titleInput: fakeInput("A Book"),
        wordsInput: fakeInput(""),
    };
}

function bindValidationFailureDialog(context) {
    const CONTEXT = context;
    bindBookDialogSubmit({
        form: CONTEXT.form,
        onComplete: () => {
            CONTEXT.completeCalls += 1;
        },
        onSubmit: () => {
            CONTEXT.submitCalls += 1;
        },
        refs: createRefs(CONTEXT.form, {
            lookupMeta: CONTEXT.lookupMeta,
            pagesTotalInput: CONTEXT.pagesTotalInput,
            saveBtn: CONTEXT.saveButton,
            scheduledDaysField: new fakeHtmlElement(),
            submitError: CONTEXT.submitError,
            titleInput: CONTEXT.titleInput,
            wordsInput: CONTEXT.wordsInput,
        }),
    });
}

function assertValidationFailure(context, preventDefaultCalls) {
    assert.equal(preventDefaultCalls, 1);
    assert.equal(context.submitCalls, 0);
    assert.equal(context.completeCalls, 0);
    assert.equal(context.saveButton.disabled, false);
    assert.equal(context.saveButton.textContent, "Save Book");
    assert.equal(
        context.submitError.textContent,
        "Enter estimated words or total pages.",
    );
    assert.equal(context.wordsInput.focusCalls, 1);
    assert.equal(context.titleInput.focusCalls, 0);
}

function createSubmitFailureContext() {
    return {
        form: new fakeFormElement(),
        lookupMeta: createLookupMeta(),
        saveButton: createSaveButton(),
        submitError: createLookupMeta(),
        titleInput: fakeInput("A Book"),
    };
}

function bindSubmitFailureDialog(context, onSubmit) {
    bindBookDialogSubmit({
        form: context.form,
        onComplete: NOOP,
        onSubmit,
        refs: createRefs(context.form, {
            lookupMeta: context.lookupMeta,
            saveBtn: context.saveButton,
            submitError: context.submitError,
            titleInput: context.titleInput,
        }),
    });
}

async function submitFailureDialog(context) {
    await withFakeHtmlElement(async () => {
        context.form.submit();
        await flushMicrotasks();
    });
}

function assertSubmitFailure(context) {
    assert.equal(context.saveButton.disabled, false);
    assert.equal(context.saveButton.textContent, "Save Book");
    assert.equal(
        context.submitError.textContent,
        "The book could not be saved. Try again or open Help/Logs for details",
    );
    assert.equal(context.titleInput.focusCalls, 0);
}

test("bindBookDialogSubmit recovers after sync validation errors", () => {
    const CONTEXT = createValidationFailureContext();
    bindValidationFailureDialog(CONTEXT);
    return withFakeHtmlElement(() => {
        const PREVENT_DEFAULT_CALLS = CONTEXT.form.submit();
        assertValidationFailure(CONTEXT, PREVENT_DEFAULT_CALLS);
    });
});

test("bindBookDialogSubmit restores save state after async submit failure", async () => {
    const CONTEXT = createSubmitFailureContext();
    bindSubmitFailureDialog(CONTEXT, () =>
        Promise.reject(new Error("Could not save this book.")),
    );
    await submitFailureDialog(CONTEXT);
    assertSubmitFailure(CONTEXT);
});

test("bindBookDialogSubmit restores save state after sync submit failure", async () => {
    const CONTEXT = createSubmitFailureContext();
    bindSubmitFailureDialog(CONTEXT, () => {
        throw new Error("Could not save this book.");
    });
    await submitFailureDialog(CONTEXT);
    assertSubmitFailure(CONTEXT);
});
