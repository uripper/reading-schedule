import assert from "node:assert/strict";
import test from "node:test";

import { bindTodayProgressInputs } from "../dist/renderer/app/today/today_carousel_progress_bindings.js";
import { resetTodayCarouselUiState } from "../dist/renderer/app/today/today_carousel_state.js";

class FakeInputElement {
    constructor() {
        this.max = "";
        this.oninput = null;
        this.placeholder = "";
        this.value = "";
    }

    removeAttribute(name) {
        if (name === "max") {
            this.max = "";
        }
    }
}

test("bindTodayProgressInputs opens with empty values and placeholder hints", () => {
    const ORIGINAL_DOCUMENT = globalThis.document;
    const ORIGINAL_HTML_ELEMENT = globalThis.HTMLElement;
    const PAGES_INPUT = new FakeInputElement();
    const PERCENT_INPUT = new FakeInputElement();

    globalThis.HTMLElement = FakeInputElement;
    globalThis.document = {
        getElementById(id) {
            if (id === "todayPagesInput") {
                return PAGES_INPUT;
            }
            if (id === "todayPercentInput") {
                return PERCENT_INPUT;
            }
            return null;
        },
    };

    try {
        resetTodayCarouselUiState();
        bindTodayProgressInputs({
            pagesRead: 120,
            pagesTotal: 328,
            progressPercent: 36.6,
            row: { rowKey: "row-1" },
        });

        assert.equal(PAGES_INPUT.value, "");
        assert.equal(PAGES_INPUT.placeholder, "120");
        assert.equal(PERCENT_INPUT.value, "");
        assert.equal(PERCENT_INPUT.placeholder, "36.6");
    } finally {
        resetTodayCarouselUiState();
        if (ORIGINAL_HTML_ELEMENT === undefined) {
            delete globalThis.HTMLElement;
        } else {
            globalThis.HTMLElement = ORIGINAL_HTML_ELEMENT;
        }
        if (ORIGINAL_DOCUMENT === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = ORIGINAL_DOCUMENT;
        }
    }
});

test("bindTodayProgressInputs updates reciprocal placeholder hints while typing", () => {
    const ORIGINAL_DOCUMENT = globalThis.document;
    const ORIGINAL_HTML_ELEMENT = globalThis.HTMLElement;
    const PAGES_INPUT = new FakeInputElement();
    const PERCENT_INPUT = new FakeInputElement();

    globalThis.HTMLElement = FakeInputElement;
    globalThis.document = {
        getElementById(id) {
            if (id === "todayPagesInput") {
                return PAGES_INPUT;
            }
            if (id === "todayPercentInput") {
                return PERCENT_INPUT;
            }
            return null;
        },
    };

    try {
        resetTodayCarouselUiState();
        bindTodayProgressInputs({
            pagesRead: 120,
            pagesTotal: 328,
            progressPercent: 36.6,
            row: { rowKey: "row-1" },
        });

        PERCENT_INPUT.value = "25";
        PERCENT_INPUT.oninput();
        assert.equal(PAGES_INPUT.placeholder, "82");

        PAGES_INPUT.value = "164";
        PAGES_INPUT.oninput();
        assert.equal(PERCENT_INPUT.placeholder, "50");
    } finally {
        resetTodayCarouselUiState();
        if (ORIGINAL_HTML_ELEMENT === undefined) {
            delete globalThis.HTMLElement;
        } else {
            globalThis.HTMLElement = ORIGINAL_HTML_ELEMENT;
        }
        if (ORIGINAL_DOCUMENT === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = ORIGINAL_DOCUMENT;
        }
    }
});

test("bindTodayProgressInputs clamps oversize page and percent values while typing", () => {
    const ORIGINAL_DOCUMENT = globalThis.document;
    const ORIGINAL_HTML_ELEMENT = globalThis.HTMLElement;
    const PAGES_INPUT = new FakeInputElement();
    const PERCENT_INPUT = new FakeInputElement();

    globalThis.HTMLElement = FakeInputElement;
    globalThis.document = {
        getElementById(id) {
            if (id === "todayPagesInput") {
                return PAGES_INPUT;
            }
            if (id === "todayPercentInput") {
                return PERCENT_INPUT;
            }
            return null;
        },
    };

    try {
        resetTodayCarouselUiState();
        bindTodayProgressInputs({
            pagesRead: 120,
            pagesTotal: 336,
            progressPercent: 36.6,
            row: { rowKey: "row-1" },
        });

        PAGES_INPUT.value = "99999999";
        PAGES_INPUT.oninput();
        assert.equal(PAGES_INPUT.value, "336");
        assert.equal(PERCENT_INPUT.placeholder, "100");

        PERCENT_INPUT.value = "999999";
        PERCENT_INPUT.oninput();
        assert.equal(PERCENT_INPUT.value, "100");
        assert.equal(PAGES_INPUT.placeholder, "336");
    } finally {
        resetTodayCarouselUiState();
        if (ORIGINAL_HTML_ELEMENT === undefined) {
            delete globalThis.HTMLElement;
        } else {
            globalThis.HTMLElement = ORIGINAL_HTML_ELEMENT;
        }
        if (ORIGINAL_DOCUMENT === undefined) {
            delete globalThis.document;
        } else {
            globalThis.document = ORIGINAL_DOCUMENT;
        }
    }
});
