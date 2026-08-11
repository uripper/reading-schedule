// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { bindTodayProgressInputs } from "../dist/renderer/app/today/today_carousel_progress_bindings.js";
import { resetTodayCarouselUiState } from "../dist/renderer/app/today/today_carousel_state.js";

const FOCUS_CONTROLS_CSS = readFileSync(
    new URL("../styles/today-focus-controls.css", import.meta.url),
    "utf8",
);
const INDEX_HTML = readFileSync(
    new URL("../index.html", import.meta.url),
    "utf8",
);

function fakeInputElement() {
    this.max = "";
    this.onblur = null;
    this.oninput = null;
    this.placeholder = "";
    this.value = "";
}

fakeInputElement.prototype.removeAttribute = function (name) {
    if (name === "max") {
        this.max = "";
    }
};

function fakePanelElement() {
    const CLASSES = new Set();
    const PANEL = new fakeInputElement();
    PANEL.classList = {
        contains(name) {
            return CLASSES.has(name);
        },
        remove(name) {
            CLASSES.delete(name);
        },
        toggle(name, enabled) {
            if (enabled) {
                CLASSES.add(name);
                return;
            }
            CLASSES.delete(name);
        },
    };
    return PANEL;
}

function fakeTodayInputsDocument(pagesInput, percentInput, progressPanel) {
    const ELEMENTS = {
        todayPagesInput: pagesInput,
        todayPercentInput: percentInput,
        todayProgressPanel: progressPanel,
    };
    return {
        getElementById(id) {
            return ELEMENTS[id] ?? null;
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
        progressPanel: fakePanelElement(),
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
        fixtures.progressPanel,
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

test("bindTodayProgressInputs preserves a trailing decimal and finalizes on blur", () => {
    bindTodayProgressInputFixtures({ pagesTotal: 336 }, ({ percentInput }) => {
        percentInput.value = "9,";
        percentInput.oninput();
        assert.equal(percentInput.value, "9.");

        percentInput.value = "9.95";
        percentInput.oninput();
        assert.equal(percentInput.value, "9.95");
        percentInput.onblur();
        assert.equal(percentInput.value, "10");
    });
});

test("either entered progress field activates black reciprocal hints", () => {
    bindTodayProgressInputFixtures(
        { pagesTotal: 336 },
        ({ pagesInput, progressPanel }) => {
            assert.equal(
                progressPanel.classList.contains("has-progress-entry"),
                false,
            );
            pagesInput.value = "100";
            pagesInput.oninput();
            assert.equal(
                progressPanel.classList.contains("has-progress-entry"),
                true,
            );
        },
    );
});

test("Today progress markup and styles expose decimal help and readable states", () => {
    assert.match(INDEX_HTML, /pattern="\[0-9\]\*\(\[\.,\]\[0-9\]\*\)\?"/u);
    assert.match(INDEX_HTML, /aria-describedby="todayPercentInputHint"/u);
    assert.match(FOCUS_CONTROLS_CSS, /\.has-progress-entry/u);
    assert.match(FOCUS_CONTROLS_CSS, /\.today-focus-panel\.is-complete/u);
    assert.doesNotMatch(FOCUS_CONTROLS_CSS, /font-size:\s*0\./u);
});
