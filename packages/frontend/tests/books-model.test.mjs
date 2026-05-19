// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import {
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
    BOOK_STATUS_TO_READ,
} from "../dist/renderer/books/status_catalog.js";

test("normalizeBook keeps explicit finish date for read books", () => {
    const NORMALIZED = normalizeBook({
        finished_at: "2026-02-10",
        status: BOOK_STATUS_READ,
        title: "Read Book",
        words_total: 1000,
    });

    assert.equal(NORMALIZED.finished_at, "2026-02-10");
});

test("normalizeBook keeps finish date empty for read books until chosen", () => {
    const NORMALIZED = normalizeBook({
        finished_at: "",
        status: BOOK_STATUS_READ,
        title: "Read Book",
        words_total: 1000,
    });

    assert.equal(NORMALIZED.finished_at, null);
});

test("normalizeBook clears finish date for non-read books", () => {
    const NORMALIZED = normalizeBook({
        finished_at: "2026-02-10",
        status: BOOK_STATUS_IN_PROGRESS,
        title: "In Progress Book",
        words_total: 1000,
    });

    assert.equal(NORMALIZED.finished_at, null);
});

test("normalizeBook promotes books with pages read to in-progress", () => {
    const NORMALIZED = normalizeBook({
        pages_read: 50,
        pages_total: null,
        progress_percent: 0,
        status: BOOK_STATUS_TO_READ,
        title: "Started Book",
        words_total: 1000,
    });

    assert.equal(NORMALIZED.status, BOOK_STATUS_IN_PROGRESS);
});
