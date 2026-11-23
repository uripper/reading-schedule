/** After Book picker: candidate ranking and cycle exclusion. */
import assert from "node:assert/strict";
import test from "node:test";

import {
    excludedAfterBookIds,
    rankAfterBookCandidates,
} from "../dist/renderer/books/after_book_ranking.js";
import { blockedDescendantIds } from "../dist/renderer/books/blocker-lineage.js";
import { book } from "./helpers/books-collections.mjs";

const NOTHING = new Set();

function ids(books) {
    return books.map((entry) => entry.book_id);
}

test("same-shelf books rank first, then shared collections, then the rest", () => {
    const BOOKS = [
        book({ book_id: "other", title: "Aardvark" }),
        book({ book_id: "shared", collections: ["Sci-Fi"], title: "Beta" }),
        book({ book_id: "shelf", shelf: "Home", title: "Zulu" }),
    ];
    const RANKED = rankAfterBookCandidates(
        BOOKS,
        { collections: ["sci-fi"], excludedIds: NOTHING, shelf: "Home" },
        "",
    );
    assert.deepEqual(ids(RANKED), ["shelf", "shared", "other"]);
});

test("typing filters candidates and prefers word-start matches within a group", () => {
    const BOOKS = [
        book({ book_id: "inside", title: "Undertow" }),
        book({ book_id: "start", title: "The Tower" }),
        book({ book_id: "miss", title: "Dune" }),
    ];
    const RANKED = rankAfterBookCandidates(
        BOOKS,
        { collections: [], excludedIds: NOTHING, shelf: "" },
        "tow",
    );
    assert.deepEqual(ids(RANKED), ["start", "inside"]);
});

test("books that already come after the edited book are cycle-makers", () => {
    const BOOKS = [
        book({ book_id: "a" }),
        book({ blocked_by: "a", book_id: "b" }),
        book({ blocked_by: "b", book_id: "c" }),
        book({ book_id: "d" }),
    ];
    assert.deepEqual([...blockedDescendantIds(BOOKS, "a")].toSorted(), [
        "b",
        "c",
    ]);
    assert.deepEqual([...excludedAfterBookIds(BOOKS, "a")].toSorted(), [
        "a",
        "b",
        "c",
    ]);
    assert.deepEqual([...excludedAfterBookIds(BOOKS, "")], []);
});

test("an existing loop in saved data does not hang cycle detection", () => {
    const BOOKS = [
        book({ blocked_by: "y", book_id: "x" }),
        book({ blocked_by: "x", book_id: "y" }),
        book({ book_id: "z" }),
    ];
    assert.deepEqual([...blockedDescendantIds(BOOKS, "z")], []);
});

test("excluded ids are never offered", () => {
    const BOOKS = [book({ book_id: "keep" }), book({ book_id: "drop" })];
    const RANKED = rankAfterBookCandidates(
        BOOKS,
        { collections: [], excludedIds: new Set(["drop"]), shelf: "" },
        "",
    );
    assert.deepEqual(ids(RANKED), ["keep"]);
});
