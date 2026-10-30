// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers the optional per-book session checkbox, input validation, and approval state. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { matchSyncRecord } from "../dist/renderer/sync/matching.js";
import { createSyncReviewRow } from "../dist/renderer/sync/review-row.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const RECORD = {
    dateLastRead: "2026-02-02T12:00:00Z",
    percentRead: 60,
    provider: "kobo",
    sourceId: "book",
    title: "Book",
};
const BOOK = normalizeBook({ book_id: "book", title: "Book" });

function fakeOption(label, value) {
    const OPTION = document.createElement("option");
    OPTION.textContent = label;
    OPTION.value = value;
    return OPTION;
}

function setup(t) {
    const DOM = installFakeDom();
    const PREVIOUS = globalThis.Option;
    globalThis.Option = fakeOption;
    t.after(() => {
        globalThis.Option = PREVIOUS;
        DOM.restore();
    });
    const ROW = createSyncReviewRow(matchSyncRecord(RECORD, [BOOK]));
    const PANEL = ROW.element.querySelector(".sync-session");
    const [CHECK, INPUT] = PANEL.querySelectorAll("input");
    return {
        check: CHECK,
        field: PANEL.querySelector(".sync-session-minutes"),
        input: INPUT,
        row: ROW,
    };
}

test("reading time starts unchecked and only reveals minutes when selected", (t) => {
    const { check: CHECK, field: FIELD, input: INPUT, row: ROW } = setup(t);
    assert.equal(CHECK.checked, false);
    assert.equal(FIELD.hidden, true);
    assert.equal(ROW.choice()[0].sessionMinutes, undefined);
    CHECK.checked = true;
    CHECK.dispatch("change");
    assert.equal(FIELD.hidden, false);
    assert.equal(INPUT.focusCalls, 1);
    INPUT.value = "35";
    assert.equal(ROW.choice()[0].sessionMinutes, 35);
    CHECK.checked = false;
    CHECK.dispatch("change");
    assert.equal(ROW.choice()[0].sessionMinutes, undefined);
});

test("opted-in time must be a positive whole number within today", (t) => {
    const { check: CHECK, input: INPUT, row: ROW } = setup(t);
    CHECK.checked = true;
    for (const VALUE of [
        "",
        "0",
        "-5",
        "1.5",
        "1441",
        "Infinity",
        "nonsense",
    ]) {
        INPUT.value = VALUE;
        assert.throws(() => ROW.choice(), /whole number of minutes/);
    }
    INPUT.value = "1440";
    assert.equal(ROW.choice()[0].sessionMinutes, 1440);
});

test("deselecting, changing a match, and ignoring cannot add unapproved sessions", (t) => {
    const { check: CHECK, input: INPUT, row: ROW } = setup(t);
    CHECK.checked = true;
    INPUT.value = "20";
    ROW.selectSafe(false);
    assert.equal(CHECK.disabled, true);
    assert.deepEqual(ROW.choice(), []);
    ROW.selectSafe(true);
    assert.equal(CHECK.disabled, false);
    assert.equal(ROW.choice()[0].sessionMinutes, 20);
    ROW.element.querySelector("select").dispatch("change");
    assert.equal(CHECK.disabled, true);
    assert.deepEqual(ROW.choice(), []);
    ROW.dismiss();
    assert.deepEqual(ROW.choice(), []);
});
