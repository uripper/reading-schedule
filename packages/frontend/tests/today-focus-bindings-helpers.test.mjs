// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";
import {
    afterSessionText,
    setLogButtonState,
} from "../dist/renderer/app/today/today_carousel_panel.js";

function mockElement() {
    const CALLS = [];
    const ATTRIBUTES = [];
    return {
        attributes: ATTRIBUTES,
        classList: {
            calls: CALLS,
            toggle(className, enabled) {
                CALLS.push([className, enabled]);
            },
        },
        setAttribute(name, value) {
            ATTRIBUTES.push([name, value]);
        },
        textContent: "",
    };
}

function withMockDom(elements, action) {
    const PREVIOUS_DOCUMENT = globalThis.document;
    const PREVIOUS_HTML_ELEMENT = globalThis.HTMLElement;
    globalThis.HTMLElement = Object;
    globalThis.document = {
        getElementById(id) {
            return elements[id] ?? null;
        },
    };
    try {
        action();
    } finally {
        globalThis.document = PREVIOUS_DOCUMENT;
        globalThis.HTMLElement = PREVIOUS_HTML_ELEMENT;
    }
}

test("afterSessionText formats placeholder pages and rounded percent", () => {
    assert.equal(
        afterSessionText({ afterPagesRead: null, afterPercent: 12.34 }),
        "-- pages • 12.3%",
    );
});

test("setLogButtonState updates a tiny mocked DOM", () => {
    const BUTTON = mockElement();
    const PANEL = mockElement();
    withMockDom({ todayFocusPanel: PANEL, todayLogSessionBtn: BUTTON }, () => {
        setLogButtonState(true);
        assert.equal(BUTTON.textContent, "Reopen session");
        assert.deepEqual(BUTTON.attributes, [["aria-pressed", "true"]]);
        assert.deepEqual(BUTTON.classList.calls, [["is-complete", true]]);
        assert.deepEqual(PANEL.classList.calls, [["is-complete", true]]);
    });
});
