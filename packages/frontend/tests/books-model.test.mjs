// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import {
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
} from "../dist/renderer/books/status_catalog.js";
import { dayKey } from "../dist/renderer/calendar/utils.js";

test("normalizeBook keeps explicit finish date for read books", () => {
    const NORMALIZED = normalizeBook({
        finished_at: "2026-02-10",
        status: BOOK_STATUS_READ,
        title: "Read Book",
        words_total: 1000,
    });

    assert.equal(NORMALIZED.finished_at, "2026-02-10");
});

test("normalizeBook defaults finish date to today for read books", () => {
    const TODAY = dayKey(new Date());
    const NORMALIZED = normalizeBook({
        finished_at: "",
        status: BOOK_STATUS_READ,
        title: "Read Book",
        words_total: 1000,
    });

    assert.equal(NORMALIZED.finished_at, TODAY);
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
