import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model.js";
import {
    BOOK_STATUS_IN_PROGRESS,
    BOOK_STATUS_READ,
} from "../dist/renderer/books/status_catalog.js";
import { dayKey } from "../dist/renderer/calendar/utils.js";

test("normalizeBook keeps explicit finish date for read books", () => {
    const normalized = normalizeBook({
        finished_at: "2026-02-10",
        status: BOOK_STATUS_READ,
        title: "Read Book",
        words_total: 1000,
    });

    assert.equal(normalized.finished_at, "2026-02-10");
});

test("normalizeBook defaults finish date to today for read books", () => {
    const today = dayKey(new Date());
    const normalized = normalizeBook({
        finished_at: "",
        status: BOOK_STATUS_READ,
        title: "Read Book",
        words_total: 1000,
    });

    assert.equal(normalized.finished_at, today);
});

test("normalizeBook clears finish date for non-read books", () => {
    const normalized = normalizeBook({
        finished_at: "2026-02-10",
        status: BOOK_STATUS_IN_PROGRESS,
        title: "In Progress Book",
        words_total: 1000,
    });

    assert.equal(normalized.finished_at, null);
});
