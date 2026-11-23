/** After Book picker keys: arrows reopen a closed menu at the right end. */
import assert from "node:assert/strict";
import test from "node:test";

import { bindAfterBookPickerEvents } from "../dist/renderer/books/after_book_picker_bindings.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const CANDIDATES = [{ book_id: "a" }, { book_id: "b" }, { book_id: "c" }];

/**
 * Binds the picker with a refresh that fills the menu and highlights row 0,
 * as the real refresh does.
 */
function bindPicker(environment) {
    const INPUT = environment.createElement("input");
    const STATE = { activeIndex: -1, filtered: [] };
    const NOOP = () => {};
    bindAfterBookPickerEvents({
        clearResults() {
            STATE.filtered = [];
        },
        clearSelection: NOOP,
        refreshFiltered() {
            STATE.filtered = [...CANDIDATES];
            STATE.activeIndex = 0;
        },
        refs: {
            afterBookInput: INPUT,
            afterBookResults: environment.createElement("div"),
        },
        render: NOOP,
        selectBook: NOOP,
        state: STATE,
    });
    return { INPUT, STATE };
}

test("Arrow Up on a closed menu opens it at the last option", () => {
    const ENVIRONMENT = installFakeDom();
    try {
        const { INPUT, STATE } = bindPicker(ENVIRONMENT);
        INPUT.dispatch("keydown", { key: "ArrowUp" });
        assert.equal(STATE.filtered.length, CANDIDATES.length);
        assert.equal(STATE.activeIndex, CANDIDATES.length - 1);
    } finally {
        ENVIRONMENT.restore();
    }
});

test("Arrow Down on a closed menu opens it at the first option", () => {
    const ENVIRONMENT = installFakeDom();
    try {
        const { INPUT, STATE } = bindPicker(ENVIRONMENT);
        INPUT.dispatch("keydown", { key: "ArrowDown" });
        assert.equal(STATE.activeIndex, 0);
    } finally {
        ENVIRONMENT.restore();
    }
});
