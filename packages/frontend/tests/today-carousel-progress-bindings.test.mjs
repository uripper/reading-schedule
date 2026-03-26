// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { bindTodayProgressInputs } from "../dist/renderer/app/today/today_carousel_progress_bindings.js";
import { resetTodayCarouselUiState } from "../dist/renderer/app/today/today_carousel_state.js";

function fakeInputElement() {
    this.max = "";
    this.oninput = null;
    this.placeholder = "";
    this.value = "";
}

fakeInputElement.prototype.removeAttribute = function (name) {
    if (name === "max") {
        this.max = "";
    }
};

function fakeTodayInputsDocument(pagesInput, percentInput) {
    return {
        getElementById(id) {
            if (id === "todayPagesInput") {
                return pagesInput;
            }
            if (id === "todayPercentInput") {
                return percentInput;
            }
            return null;
        },
    };
}

function restoreGlobalValue(key, value) {
    if (value === undefined) {
        delete globalThis[key];
        return;
    }
    globalThis[key] = value;
}

function progressInputFixtures() {
    return {
        pagesInput: new fakeInputElement(),
        percentInput: new fakeInputElement(),
    };
}

function restoreTodayProgressGlobals(originalDocument, originalHtmlElement) {
    restoreGlobalValue("HTMLElement", originalHtmlElement);
    restoreGlobalValue("document", originalDocument);
}

function installTodayProgressGlobals(fixtures) {
    globalThis.HTMLElement = fakeInputElement;
    globalThis.document = fakeTodayInputsDocument(
        fixtures.pagesInput,
        fixtures.percentInput,
    );
}

function bindTodayProgressFixtures(options) {
    resetTodayCarouselUiState();
    bindTodayProgressInputs({
        pagesRead: 120,
        pagesTotal: options.pagesTotal,
        progressPercent: 36.6,
        row: { rowKey: "row-1" },
    });
}

function bindTodayProgressInputFixtures(options, work) {
    const ORIGINAL_DOCUMENT = globalThis.document;
    const ORIGINAL_HTML_ELEMENT = globalThis.HTMLElement;
    const FIXTURES = progressInputFixtures();
    installTodayProgressGlobals(FIXTURES);
    try {
        bindTodayProgressFixtures(options);
        work(FIXTURES);
    } finally {
        resetTodayCarouselUiState();
        restoreTodayProgressGlobals(ORIGINAL_DOCUMENT, ORIGINAL_HTML_ELEMENT);
    }
}

test("bindTodayProgressInputs opens with empty values and placeholder hints", () => {
    bindTodayProgressInputFixtures(
        { pagesTotal: 328 },
        ({ pagesInput, percentInput }) => {
            assert.equal(pagesInput.value, "");
            assert.equal(pagesInput.placeholder, "120");
            assert.equal(percentInput.value, "");
            assert.equal(percentInput.placeholder, "36.6");
        },
    );
});

test("bindTodayProgressInputs updates reciprocal placeholder hints while typing", () => {
    bindTodayProgressInputFixtures(
        { pagesTotal: 328 },
        ({ pagesInput, percentInput }) => {
            percentInput.value = "25";
            percentInput.oninput();
            assert.equal(pagesInput.placeholder, "82");
            pagesInput.value = "164";
            pagesInput.oninput();
            assert.equal(percentInput.placeholder, "50");
        },
    );
});

test("bindTodayProgressInputs clamps oversize page and percent values while typing", () => {
    bindTodayProgressInputFixtures(
        { pagesTotal: 336 },
        ({ pagesInput, percentInput }) => {
            pagesInput.value = "99999999";
            pagesInput.oninput();
            assert.equal(pagesInput.value, "336");
            assert.equal(percentInput.placeholder, "100");
            percentInput.value = "999999";
            percentInput.oninput();
            assert.equal(percentInput.value, "100");
            assert.equal(pagesInput.placeholder, "336");
        },
    );
});
