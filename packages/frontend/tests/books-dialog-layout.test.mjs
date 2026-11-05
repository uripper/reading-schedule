/** Covers progress input modes and validation recovery inside the dialog sections. */
import assert from "node:assert/strict";
import test from "node:test";
import {
    bindBookDialogProgressSync,
    resetBookDialogProgress,
} from "../dist/renderer/books/dialog_progress_sync.js";
import { showSubmitError } from "../dist/renderer/books/dialog_submit.js";
import { createRefs } from "./helpers/books-dialog-submit.mjs";
import { installFakeDom } from "./helpers/fake-dom.mjs";

/** Creates the form fields and disclosure controls used by the runtime bindings. */
function progressForm(t, values) {
    const DOM = installFakeDom();
    t.after(() => {
        DOM.restore();
    });
    const FORM = DOM.createElement("form");
    const REFS = createRefs(FORM);
    const SECTION = DOM.createElement("details");
    const NODES = {
        meter: DOM.createElement("progress", "bookProgressMeter"),
        pages: DOM.createElement("label", "bookPagesReadField"),
        pagesButton: DOM.createElement("button", "bookProgressPagesBtn"),
        percent: DOM.createElement("label", "bookProgressPercentField"),
        percentButton: DOM.createElement("button", "bookProgressPercentBtn"),
        readout: DOM.createElement("span", "bookProgressValue"),
    };
    for (const [KEY, VALUE] of Object.entries(values)) {
        const INPUT = DOM.createElement("input");
        INPUT.value = VALUE;
        REFS[KEY] = INPUT;
    }
    REFS.statusSelectInput = DOM.createElement("select");
    SECTION.append(...Object.values(NODES));
    FORM.append(SECTION);
    DOM.document.body.append(FORM);
    NODES.percentButton.getAttribute = (name) =>
        NODES.percentButton.attributes.get(name);
    bindBookDialogProgressSync(REFS);
    resetBookDialogProgress(REFS);
    return { nodes: NODES, refs: REFS };
}

test("switching from pages to percent keeps both values and updates the meter while editing", (t) => {
    const { nodes: NODES, refs: REFS } = progressForm(t, {
        pagesReadInput: "280",
        pagesTotalInput: "682",
        progressInput: "41.1",
    });
    assert.equal(NODES.readout.textContent, "41.1%");
    assert.equal(NODES.pages.hidden, false);
    NODES.percentButton.click();
    assert.equal(NODES.pages.hidden, true);
    assert.equal(NODES.percent.hidden, false);
    assert.equal(REFS.pagesReadInput.value, "280");
    REFS.progressInput.value = "50";
    REFS.progressInput.dispatch("input");
    assert.equal(REFS.pagesReadInput.value, "341");
    assert.equal(NODES.meter.value, 50);
});

test("adding a page total preserves progress entered in percent mode", (t) => {
    const { nodes: NODES, refs: REFS } = progressForm(t, {
        pagesReadInput: "",
        pagesTotalInput: "",
        progressInput: "25",
    });
    assert.equal(NODES.percent.hidden, false);
    REFS.pagesTotalInput.value = "200";
    REFS.pagesTotalInput.dispatch("input");
    assert.equal(REFS.pagesReadInput.value, "50");
    assert.equal(NODES.readout.textContent, "25%");
});

test("missing reading length opens Additional Options and focuses Estimated Words", (t) => {
    const DOM = installFakeDom();
    t.after(() => {
        DOM.restore();
    });
    const FORM = DOM.createElement("form");
    const OPTIONS = DOM.createElement("details");
    OPTIONS.open = false;
    const WORDS = DOM.createElement("input");
    OPTIONS.append(WORDS);
    FORM.append(OPTIONS);
    const REFS = createRefs(FORM, { wordsInput: WORDS });
    const MESSAGE = "Enter estimated words or total pages.";
    showSubmitError(REFS, new Error(MESSAGE));
    assert.equal(OPTIONS.open, true);
    assert.equal(WORDS.focusCalls, 1);
    assert.equal(REFS.submitError.textContent, MESSAGE);
});
