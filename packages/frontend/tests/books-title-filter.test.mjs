import assert from "node:assert/strict";
import test from "node:test";

import { matchesTitleFilter } from "../dist/renderer/books/controller_render_helpers.js";
import { ensureBooksToolbarControls } from "../dist/renderer/books/toolbar_dom.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const BOOK = (title, author = "") => {
    return { author, title };
};

function assertKeywordMatch(query, expected) {
    assert.equal(
        matchesTitleFilter(
            BOOK("Against Interpretation", "Susan Sontag"),
            query,
        ),
        expected,
    );
}

test("matchesTitleFilter returns true for empty filters", () => {
    assert.equal(matchesTitleFilter(BOOK("Against Interpretation"), ""), true);
    assert.equal(
        matchesTitleFilter(BOOK("Against Interpretation"), "   "),
        true,
    );
});

test("matchesTitleFilter applies case-insensitive keyword matching", () => {
    assertKeywordMatch("against", true);
    assertKeywordMatch("TERPRET", true);
    assertKeywordMatch("sontag", true);
    assertKeywordMatch("orwell", false);
});

const KEYWORD_BOOK = {
    author: "Ursula K. Le Guin",
    deadline: "2026-12-01",
    finished_at: null,
    lookup_note: "Hainish cycle",
    pages_total: 387,
    shelf: "Science Fiction",
    status: "in_progress",
    title: "The Dispossessed",
};

function assertBookKeywordMatch(query, expected) {
    assert.equal(matchesTitleFilter(KEYWORD_BOOK, query), expected, query);
}

test("matchesTitleFilter searches shelf, status, note, dates, and pages", () => {
    assertBookKeywordMatch("science fiction", true);
    assertBookKeywordMatch("in progress", true);
    assertBookKeywordMatch("hainish", true);
    assertBookKeywordMatch("2026-12", true);
    assertBookKeywordMatch("387", true);
    assertBookKeywordMatch("dropped", false);
});

test("matchesTitleFilter requires every keyword to match some field", () => {
    assertBookKeywordMatch("le guin dispossessed", true);
    assertBookKeywordMatch("dispossessed   fiction", true);
    assertBookKeywordMatch("dispossessed orwell", false);
});

test("matchesTitleFilter ignores missing page counts", () => {
    const BOOK_WITHOUT_PAGES = { ...KEYWORD_BOOK, pages_total: null };
    assert.equal(matchesTitleFilter(BOOK_WITHOUT_PAGES, "null"), false);
});

test("keyword search shows a short placeholder and a hint listing searchable fields", () => {
    const DOM = installFakeDom();
    try {
        const TOOLBAR = DOM.createElement("div");
        const { titleFilterInput } = ensureBooksToolbarControls(TOOLBAR);
        const HINT = TOOLBAR.querySelector(".hint-dot");
        assert.equal(
            titleFilterInput.placeholder,
            "Search title, author, etc...",
        );
        assert.ok(HINT);
        for (const FIELD of [
            "title",
            "author",
            "shelf",
            "status",
            "page count",
        ]) {
            assert.equal(HINT.dataset.tip.includes(FIELD), true, FIELD);
        }
    } finally {
        DOM.restore();
    }
});
