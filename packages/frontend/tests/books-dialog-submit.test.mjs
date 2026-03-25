// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
/**
 * Regression test for book dialog submit recovery after sync validation failures.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { bindBookDialogSubmit } from "../dist/renderer/books/dialog_submit.js";
import { clearForm } from "../dist/renderer/books/form-state.js";

const NOOP = () => undefined;
const MICROTASK_FLUSH_COUNT = 5;

function fakeHtmlElement() {
    this.focusCalls = 0;
}

fakeHtmlElement.prototype.focus = function () {
    this.focusCalls += 1;
};

fakeHtmlElement.prototype.querySelector = () => null;

fakeHtmlElement.prototype.querySelectorAll = () => [];

function createClassList() {
    return {
        toggle() {
            return undefined;
        },
    };
}

function fakeFormElement() {
    fakeHtmlElement.call(this);
    this.handlers = new Map();
}

fakeFormElement.prototype = Object.create(fakeHtmlElement.prototype);
fakeFormElement.prototype.constructor = fakeFormElement;

fakeFormElement.prototype.addEventListener = function (type, handler) {
    this.handlers.set(type, handler);
};

fakeFormElement.prototype.reset = function () {
    return undefined;
};

fakeFormElement.prototype.submit = function () {
    const HANDLER = this.handlers.get("submit");
    assert.ok(HANDLER);
    let preventDefaultCalls = 0;
    HANDLER({
        preventDefault() {
            preventDefaultCalls += 1;
        },
    });
    return preventDefaultCalls;
};

function flushMicrotasks() {
    let flush = Promise.resolve();
    for (let index = 0; index < MICROTASK_FLUSH_COUNT; index += 1) {
        flush = flush.then(NOOP);
    }
    return flush;
}

function restoreGlobalValue(key, value) {
    if (value === undefined) {
        delete globalThis[key];
        return;
    }
    globalThis[key] = value;
}

async function withFakeHtmlElement(work) {
    const ORIGINAL_HTML_ELEMENT = globalThis.HTMLElement;
    globalThis.HTMLElement = fakeHtmlElement;
    try {
        await work();
    } finally {
        restoreGlobalValue("HTMLElement", ORIGINAL_HTML_ELEMENT);
    }
}

function fakeInput(value = "") {
    const INPUT = new fakeHtmlElement();
    INPUT.defaultValue = "";
    INPUT.disabled = false;
    INPUT.classList = createClassList();
    INPUT.value = value;
    INPUT.valueAsDate = null;
    return INPUT;
}

function checkedScheduledDaysField() {
    const CHECKBOX = { checked: true, value: "Mon" };
    return {
        querySelector() {
            return CHECKBOX;
        },
        querySelectorAll() {
            return [CHECKBOX];
        },
    };
}

function createLookupMeta() {
    return { dataset: { lookupNote: "" }, textContent: "" };
}

function createSaveButton() {
    return { disabled: false, textContent: "Save Book" };
}

function createIdentityRefs() {
    return {
        author: fakeInput("Author"),
        blockedByInput: fakeInput(""),
        bookId: fakeInput("book-1"),
        coverLocal: fakeInput(""),
        coverUrl: fakeInput(""),
        titleInput: fakeInput("A Book"),
    };
}

function createPlanningRefs() {
    return {
        deadlineInput: fakeInput(""),
        difficultyInput: fakeInput("3"),
        finishedAtInput: fakeInput(""),
        maxMinutesInput: fakeInput(""),
        minBlocksInput: fakeInput("1"),
        priorityInput: fakeInput("3"),
    };
}

function createProgressRefs() {
    return {
        pagesReadInput: fakeInput(""),
        pagesTotalInput: fakeInput(""),
        progressInput: fakeInput("0"),
        shelfSelectInput: fakeInput("Shelf"),
        statusSelectInput: fakeInput("to_read"),
        wordsInput: fakeInput("95000"),
    };
}

function createRefs(form, overrides = {}) {
    const LOOKUP_META = overrides.lookupMeta ?? createLookupMeta();
    const SAVE_BUTTON = overrides.saveBtn ?? createSaveButton();
    return {
        ...createIdentityRefs(),
        ...createPlanningRefs(),
        ...createProgressRefs(),
        applyScheduledDaysToShelfInput: { checked: false },
        form,
        lookupMeta: LOOKUP_META,
        saveBtn: SAVE_BUTTON,
        scheduledDaysField: checkedScheduledDaysField(),
        ...overrides,
    };
}

function createClearFormRefs(form, overrides = {}) {
    return {
        ...createRefs(form, overrides),
        afterBookInput: fakeInput("previous-link"),
        coverPreview: { classList: createClassList(), src: "" },
        coverUploadInput: fakeInput("selected-file"),
        finishedAtField: { hidden: false },
    };
}

function createValidationFailureContext() {
    return {
        completeCalls: 0,
        form: new fakeFormElement(),
        lookupMeta: createLookupMeta(),
        pagesTotalInput: fakeInput(""),
        saveButton: createSaveButton(),
        submitCalls: 0,
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
        context.lookupMeta.textContent,
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
    assert.equal(context.lookupMeta.textContent, "Could not save this book.");
    assert.equal(context.titleInput.focusCalls, 1);
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

test("clearForm clears optional date inputs instead of preserving stale values", () => {
    const FORM = new fakeFormElement();
    const DEADLINE_INPUT = fakeInput("2026-03-23");
    const FINISHED_AT_INPUT = fakeInput("2026-03-23");
    let clearResultsCalls = 0;

    clearForm(
        createClearFormRefs(FORM, {
            deadlineInput: DEADLINE_INPUT,
            finishedAtInput: FINISHED_AT_INPUT,
        }),
        {
            clearResults() {
                clearResultsCalls += 1;
            },
        },
    );

    assert.equal(DEADLINE_INPUT.value, "");
    assert.equal(DEADLINE_INPUT.defaultValue, "");
    assert.equal(FINISHED_AT_INPUT.value, "");
    assert.equal(clearResultsCalls, 1);
});
