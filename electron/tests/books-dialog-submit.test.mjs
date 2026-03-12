/**
 * Regression test for book dialog submit recovery after sync validation failures.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { bindBookDialogSubmit } from "../dist/renderer/books/dialog_submit.js";

class FakeHTMLElement {
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

class FakeFormElement extends FakeHTMLElement {
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

test("bindBookDialogSubmit recovers after sync validation errors", () => {
    const ORIGINAL_HTML_ELEMENT = globalThis.HTMLElement;
    globalThis.HTMLElement = FakeHTMLElement;

    try {
        const FORM = new FakeFormElement();
        const WORDS_INPUT = new FakeHTMLElement();
        const PAGES_TOTAL_INPUT = new FakeHTMLElement();
        const SHELF_SELECT_INPUT = new FakeHTMLElement();
        const TITLE_INPUT = new FakeHTMLElement();
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

        WORDS_INPUT.value = "";
        PAGES_TOTAL_INPUT.value = "";
        SHELF_SELECT_INPUT.value = "";

        bindBookDialogSubmit(
            FORM,
            {
                applyScheduledDaysToShelfInput: { checked: false },
                form: FORM,
                lookupMeta: LOOKUP_META,
                pagesReadInput: { value: "" },
                pagesTotalInput: PAGES_TOTAL_INPUT,
                progressInput: { value: "0" },
                saveBtn: SAVE_BUTTON,
                scheduledDaysField: new FakeHTMLElement(),
                shelfSelectInput: SHELF_SELECT_INPUT,
                titleInput: TITLE_INPUT,
                wordsInput: WORDS_INPUT,
            },
            () => {
                submitCalls += 1;
            },
            () => {
                completeCalls += 1;
            },
        );

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
    } finally {
        if (ORIGINAL_HTML_ELEMENT === undefined) {
            delete globalThis.HTMLElement;
        } else {
            globalThis.HTMLElement = ORIGINAL_HTML_ELEMENT;
        }
    }
});
