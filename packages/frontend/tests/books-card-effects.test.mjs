// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { cardClassNameForStatus } from "../dist/renderer/books/card-node-shell.js";
import {
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
} from "../dist/renderer/books/status_catalog.js";

test("cardClassNameForStatus marks read books for holo styling", () => {
    assert.equal(
        cardClassNameForStatus(BOOK_STATUS_READ),
        "book-card is-read-card",
    );
});

test("cardClassNameForStatus keeps non-read cards unstyled", () => {
    assert.equal(cardClassNameForStatus(BOOK_STATUS_IN_PROGRESS), "book-card");
});
