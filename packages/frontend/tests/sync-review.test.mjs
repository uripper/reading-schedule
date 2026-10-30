// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Exercises approval controls using the shared DOM fixture. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { matchSyncRecord } from "../dist/renderer/sync/matching.js";
import { createSyncReviewRow } from "../dist/renderer/sync/review-row.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const SOURCE = {
    dateLastRead: "2026-02-02T12:00:00Z",
    percentRead: 60,
    provider: "kobo",
    sourceId: "source",
    title: "Book",
};
const BOOK = normalizeBook({ book_id: "book", title: "Book" });

/** Supplies the browser Option constructor through existing fake DOM elements. */
function fakeOption(label, value) {
    const OPTION = document.createElement("option");
    OPTION.textContent = label;
    OPTION.value = value;
    return OPTION;
}

/** Restores globals even when a control assertion fails. */
function withDom(check) {
    const DOM = installFakeDom();
    const PREVIOUS = globalThis.Option;
    globalThis.Option = fakeOption;
    try {
        check();
    } finally {
        globalThis.Option = PREVIOUS;
        DOM.restore();
    }
}

test("safe unique matches default to checked and respect selection actions", () => {
    withDom(() => {
        const ROW = createSyncReviewRow(matchSyncRecord(SOURCE, [BOOK]));
        assert.equal(ROW.choice().length, 1);
        ROW.selectSafe(false);
        assert.equal(ROW.choice().length, 0);
        ROW.selectSafe(true);
        assert.equal(ROW.choice().length, 1);
    });
});

test("Select all cannot approve a decrease; an individual checkbox can", () => {
    withDom(() => {
        const READ = normalizeBook({ ...BOOK, progress_percent: 80 });
        const ROW = createSyncReviewRow(matchSyncRecord(SOURCE, [READ]));
        ROW.selectSafe(true);
        assert.equal(ROW.choice().length, 0);
        ROW.element.querySelector("input").checked = true;
        assert.equal(ROW.choice().length, 1);
    });
});

test("Select all keeps an individual conflict approval; Deselect all clears it", () => {
    withDom(() => {
        const READ = normalizeBook({ ...BOOK, progress_percent: 80 });
        const ROW = createSyncReviewRow(matchSyncRecord(SOURCE, [READ]));
        ROW.element.querySelector("input").checked = true;
        ROW.selectSafe(true);
        assert.equal(ROW.choice().length, 1);
        ROW.selectSafe(false);
        assert.equal(ROW.choice().length, 0);
    });
});

test("duplicate titles require both a chosen match and an explicit check", () => {
    withDom(() => {
        const OTHER = { ...BOOK, book_id: "other" };
        const ROW = createSyncReviewRow({
            matches: [BOOK, OTHER],
            record: SOURCE,
        });
        ROW.selectSafe(true);
        assert.equal(ROW.choice().length, 0);
        const SELECT = ROW.element.querySelector("select");
        SELECT.value = "other";
        SELECT.dispatch("change");
        ROW.selectSafe(true);
        assert.equal(ROW.choice().length, 0);
        ROW.element.querySelector("input").checked = true;
        assert.equal(ROW.choice()[0].bookId, "other");
    });
});

test("unmatched and stale records cannot be approved", () => {
    withDom(() => {
        const MISSING = createSyncReviewRow(matchSyncRecord(SOURCE, []));
        MISSING.selectSafe(true);
        assert.equal(MISSING.choice().length, 0);
        const NEWER = { ...BOOK, progress_updated_at: "2026-02-03T12:00:00Z" };
        const STALE = createSyncReviewRow(matchSyncRecord(SOURCE, [NEWER]));
        STALE.element.querySelector("input").checked = true;
        assert.equal(STALE.choice().length, 0);
    });
});

test("source collisions are excluded from bulk approval", () => {
    withDom(() => {
        const ROW = createSyncReviewRow({
            ...matchSyncRecord(SOURCE, [BOOK]),
            requiresSourceReview: true,
        });
        ROW.selectSafe(true);
        assert.equal(ROW.choice().length, 0);
        ROW.element.querySelector("input").checked = true;
        assert.equal(ROW.choice().length, 1);
    });
});

/** Types into the actual combobox without populating the match selector. */
function searchRow(row, query) {
    const SEARCH = row.element
        .querySelectorAll("input")
        .find((input) => input.type === "search");
    SEARCH.value = query;
    SEARCH.dispatch("input");
}

/** Chooses a visible search result by its label. */
function chooseResult(row, title) {
    const RESULT = row.element
        .querySelectorAll("li")
        .find((item) => item.textContent.includes(title));
    assert.ok(RESULT);
    RESULT.click();
}

test("an unmatched Kobo title can search and select any library book", () => {
    withDom(() => {
        const TARGET = normalizeBook({
            author: "Ursula Le Guin",
            book_id: "target",
            title: "Library edition",
        });
        const ROW = createSyncReviewRow(matchSyncRecord(SOURCE, []), [TARGET]);
        searchRow(ROW, "le guin");
        const SELECT = ROW.element.querySelector("select");
        assert.equal(
            SELECT.children.some((option) => option.value === "target"),
            false,
        );
        chooseResult(ROW, "Library edition");
        assert.equal(SELECT.value, "target");
        ROW.element.querySelector("input").checked = true;
        assert.equal(ROW.choice()[0].bookId, "target");
    });
});

test("editing the search query resets approval of the previous suggestion", () => {
    withDom(() => {
        const ROW = createSyncReviewRow(matchSyncRecord(SOURCE, [BOOK]));
        assert.equal(ROW.choice().length, 1);
        const SEARCH = ROW.element
            .querySelectorAll("input")
            .find((input) => input.type === "search");
        SEARCH.value = BOOK.title;
        SEARCH.dispatch("input");
        assert.equal(ROW.choice().length, 0);
    });
});
