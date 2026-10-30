// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers equal-percent row controls and live conflict refreshes. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { matchKoboRecord } from "../dist/renderer/kobo/matching.js";
import { bindKoboRowCollisions } from "../dist/renderer/kobo/review-collisions.js";
import { createKoboReviewRow } from "../dist/renderer/kobo/review-row.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const RECORD = {
    contentId: "one",
    dateLastRead: "2026-01-28T07:23:04Z",
    percentRead: 100,
    title: "Hamlet",
};
const BOOK = normalizeBook({
    book_id: "hamlet",
    progress_percent: 100,
    title: "Hamlet",
});

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
}

test("an equal-percent match is checked and remains selectable", (t) => {
    setup(t);
    const ROW = createKoboReviewRow(matchKoboRecord(RECORD, [BOOK]));
    assert.equal(ROW.element.querySelector("input").disabled, false);
    assert.equal(ROW.choice(false).length, 1);
    ROW.selectSafe(false);
    assert.equal(ROW.choice(false).length, 0);
    ROW.selectSafe(true);
    assert.equal(ROW.choice(false).length, 1);
});

test("returning from Add Book keeps the new match enabled and approved", (t) => {
    setup(t);
    const ROW = createKoboReviewRow(matchKoboRecord(RECORD, []), []);
    assert.equal(ROW.element.querySelector("input").disabled, true);
    ROW.setBook(BOOK);
    ROW.refresh();
    assert.equal(ROW.element.querySelector("select").value, BOOK.book_id);
    assert.equal(ROW.element.querySelector("input").disabled, false);
    assert.equal(ROW.choice(false)[0].bookId, BOOK.book_id);
});

test("a new book becomes searchable without changing another row's match", (t) => {
    setup(t);
    const ROW = createKoboReviewRow(matchKoboRecord(RECORD, [BOOK]));
    const NEW_BOOK = normalizeBook({ book_id: "new", title: "New book" });
    ROW.registerBook(NEW_BOOK);
    assert.equal(ROW.choice(false)[0].bookId, BOOK.book_id);
    const SEARCH = ROW.element
        .querySelectorAll("input")
        .find((input) => input.type === "search");
    SEARCH.value = "New book";
    SEARCH.dispatch("input");
    assert.ok(
        ROW.element
            .querySelectorAll("li")
            .some((item) => item.textContent.includes("New book")),
    );
    assert.equal(ROW.element.querySelector("select").value, BOOK.book_id);
});

test("live collision messages name the other record without duplicating progress text", (t) => {
    setup(t);
    const { first: FIRST, second: SECOND } = collisionRows();
    SECOND.setBook(BOOK);
    SECOND.setBook(BOOK);
    const TEXT = FIRST.element
        .querySelectorAll("p")
        .map((node) => node.textContent)
        .join(" ");
    assert.ok(TEXT.includes("Other"));
    assert.equal(TEXT.match(/Bartleby:/g).length, 1);
    SECOND.dismiss();
    assert.equal(SECOND.choice(true).length, 0);
    assert.equal(FIRST.element.querySelectorAll("p")[1].textContent, "");
});

/** Creates two independent rows before manually assigning them to one library book. */
function collisionRows() {
    const OTHER_BOOK = normalizeBook({ book_id: "other", title: "Other" });
    const OTHER_RECORD = { ...RECORD, contentId: "two", title: "Other" };
    const FIRST = createKoboReviewRow(matchKoboRecord(RECORD, [BOOK]), [
        BOOK,
        OTHER_BOOK,
    ]);
    const SECOND = createKoboReviewRow(
        matchKoboRecord(OTHER_RECORD, [OTHER_BOOK]),
        [BOOK, OTHER_BOOK],
    );
    bindKoboRowCollisions([FIRST, SECOND]);
    return { first: FIRST, second: SECOND };
}
