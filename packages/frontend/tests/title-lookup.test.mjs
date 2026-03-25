// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { titleByIdMap } from "../dist/renderer/books/title_lookup.js";

test("titleByIdMap prefers the full catalog input when it is available", () => {
    const VISIBLE_BOOKS = [{ book_id: "visible", title: "Visible Title" }];
    const ALL_BOOKS = [{ book_id: "full", title: "Full Catalog Title" }];

    assert.deepEqual(titleByIdMap(VISIBLE_BOOKS, ALL_BOOKS), {
        full: "Full Catalog Title",
    });
});

test("titleByIdMap falls back to the filtered list when the full catalog is empty", () => {
    assert.deepEqual(
        titleByIdMap([{ book_id: "filtered", title: "Filtered Title" }], []),
        { filtered: "Filtered Title" },
    );
});
