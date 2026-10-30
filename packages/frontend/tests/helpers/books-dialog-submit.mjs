/** Shared form fixtures for submit and reset regression tests. */
import assert from "node:assert/strict";

const NOOP = () => undefined;
const MICROTASK_FLUSH_COUNT = 5;

function fakeHtmlElement() {
    this.focusCalls = 0;
}

fakeHtmlElement.prototype.focus = function () {
    this.focusCalls += 1;
};

fakeHtmlElement.prototype.closest = () => null;

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

fakeFormElement.prototype.reset = () => undefined;

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
        submitError: createLookupMeta(),
        ...overrides,
    };
}

export {
    fakeHtmlElement,
    fakeFormElement,
    flushMicrotasks,
    withFakeHtmlElement,
    fakeInput,
    checkedScheduledDaysField,
    createLookupMeta,
    createSaveButton,
    createRefs,
};
