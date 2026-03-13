/**
 * Regression test for book dialog submit recovery after sync validation failures.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { bindBookDialogSubmit } from "../dist/renderer/books/dialog_submit.js";

const NOOP = () => undefined;
const MICROTASK_FLUSH_COUNT = 5;

class FakeHtmlElement {
    focusCalls = 0;

    focus() {
        this.focusCalls += 1;
    }

    querySelector() {
        return null;
    }

    querySelectorAll() {
        return [];
    }
}

class FakeFormElement extends FakeHtmlElement {
    handlers = new Map();

    addEventListener(type, handler) {
        this.handlers.set(type, handler);
    }

    submit() {
        const HANDLER = this.handlers.get("submit");
        assert.ok(HANDLER);
        let preventDefaultCalls = 0;
        HANDLER({
            preventDefault() {
                preventDefaultCalls += 1;
            },
        });
        return preventDefaultCalls;
    }
}

async function flushMicrotasks() {
    for (let index = 0; index < MICROTASK_FLUSH_COUNT; index += 1) {
        await Promise.resolve();
    }
}

async function withFakeHtmlElement(work) {
    const ORIGINAL_HTML_ELEMENT = globalThis.HTMLElement;
    globalThis.HTMLElement = FakeHtmlElement;

    try {
        await work();
    } finally {
        if (ORIGINAL_HTML_ELEMENT === undefined) {
            delete globalThis.HTMLElement;
        } else {
            globalThis.HTMLElement = ORIGINAL_HTML_ELEMENT;
        }
    }
}

function fakeInput(value = "") {
    const INPUT = new FakeHtmlElement();
    INPUT.value = value;
    return INPUT;
}

function checkedScheduledDaysField() {
    const CHECKBOX = {
        checked: true,
        value: "Mon",
    };
    return {
        querySelector() {
            return CHECKBOX;
        },
        querySelectorAll() {
            return [CHECKBOX];
        },
    };
}

function createRefs(form, overrides = {}) {
    const LOOKUP_META = overrides.lookupMeta ?? {
        dataset: { lookupNote: "" },
        textContent: "",
    };
    const SAVE_BUTTON = overrides.saveBtn ?? {
        disabled: false,
        textContent: "Save Book",
    };

    return {
        applyScheduledDaysToShelfInput: { checked: false },
        author: fakeInput("Author"),
        blockedByInput: fakeInput(""),
        bookId: fakeInput("book-1"),
        coverLocal: fakeInput(""),
        coverUrl: fakeInput(""),
        deadlineInput: fakeInput(""),
        difficultyInput: fakeInput("3"),
        finishedAtInput: fakeInput(""),
        form,
        lookupMeta: LOOKUP_META,
        maxMinutesInput: fakeInput(""),
        minBlocksInput: fakeInput("1"),
        pagesReadInput: fakeInput(""),
        pagesTotalInput: fakeInput(""),
        priorityInput: fakeInput("3"),
        progressInput: fakeInput("0"),
        saveBtn: SAVE_BUTTON,
        scheduledDaysField: checkedScheduledDaysField(),
        shelfSelectInput: fakeInput("Shelf"),
        statusSelectInput: fakeInput("to_read"),
        titleInput: fakeInput("A Book"),
        wordsInput: fakeInput("95000"),
        ...overrides,
    };
}

test("bindBookDialogSubmit recovers after sync validation errors", () => {
    const FORM = new FakeFormElement();
    const WORDS_INPUT = fakeInput("");
    const PAGES_TOTAL_INPUT = fakeInput("");
    const TITLE_INPUT = fakeInput("A Book");
    const SAVE_BUTTON = {
        disabled: false,
        textContent: "Save Book",
    };
    const LOOKUP_META = {
        dataset: { lookupNote: "" },
        textContent: "",
    };
    let submitCalls = 0;
    let completeCalls = 0;

    bindBookDialogSubmit(
        FORM,
        createRefs(FORM, {
            lookupMeta: LOOKUP_META,
            pagesTotalInput: PAGES_TOTAL_INPUT,
            saveBtn: SAVE_BUTTON,
            scheduledDaysField: new FakeHtmlElement(),
            titleInput: TITLE_INPUT,
            wordsInput: WORDS_INPUT,
        }),
        () => {
            submitCalls += 1;
        },
        () => {
            completeCalls += 1;
        },
    );

    return withFakeHtmlElement(() => {
        const PREVENT_DEFAULT_CALLS = FORM.submit();

        assert.equal(PREVENT_DEFAULT_CALLS, 1);
        assert.equal(submitCalls, 0);
        assert.equal(completeCalls, 0);
        assert.equal(SAVE_BUTTON.disabled, false);
        assert.equal(SAVE_BUTTON.textContent, "Save Book");
        assert.equal(
            LOOKUP_META.textContent,
            "Enter estimated words or total pages.",
        );
        assert.equal(WORDS_INPUT.focusCalls, 1);
        assert.equal(TITLE_INPUT.focusCalls, 0);
    });
});

test("bindBookDialogSubmit restores save state after async submit failure", async () => {
    const FORM = new FakeFormElement();
    const TITLE_INPUT = fakeInput("A Book");
    const SAVE_BUTTON = {
        disabled: false,
        textContent: "Save Book",
    };
    const LOOKUP_META = {
        dataset: { lookupNote: "" },
        textContent: "",
    };

    bindBookDialogSubmit(
        FORM,
        createRefs(FORM, {
            lookupMeta: LOOKUP_META,
            saveBtn: SAVE_BUTTON,
            titleInput: TITLE_INPUT,
        }),
        () => Promise.reject(new Error("Could not save this book.")),
        NOOP,
    );

    await withFakeHtmlElement(async () => {
        FORM.submit();
        await flushMicrotasks();
    });

    assert.equal(SAVE_BUTTON.disabled, false);
    assert.equal(SAVE_BUTTON.textContent, "Save Book");
    assert.equal(LOOKUP_META.textContent, "Could not save this book.");
    assert.equal(TITLE_INPUT.focusCalls, 1);
});

test("bindBookDialogSubmit restores save state after sync submit failure", async () => {
    const FORM = new FakeFormElement();
    const TITLE_INPUT = fakeInput("A Book");
    const SAVE_BUTTON = {
        disabled: false,
        textContent: "Save Book",
    };
    const LOOKUP_META = {
        dataset: { lookupNote: "" },
        textContent: "",
    };

    bindBookDialogSubmit(
        FORM,
        createRefs(FORM, {
            lookupMeta: LOOKUP_META,
            saveBtn: SAVE_BUTTON,
            titleInput: TITLE_INPUT,
        }),
        () => {
            throw new Error("Could not save this book.");
        },
        NOOP,
    );

    await withFakeHtmlElement(async () => {
        FORM.submit();
        await flushMicrotasks();
    });

    assert.equal(SAVE_BUTTON.disabled, false);
    assert.equal(SAVE_BUTTON.textContent, "Save Book");
    assert.equal(LOOKUP_META.textContent, "Could not save this book.");
    assert.equal(TITLE_INPUT.focusCalls, 1);
});
