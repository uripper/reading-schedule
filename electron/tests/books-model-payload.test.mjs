import assert from "node:assert/strict";
import test from "node:test";

import { toPayloadBook } from "../dist/renderer/books/model_payload.js";

const DEFAULT_BOOK = {
    author: "Author",
    blocked_by: null,
    book_id: "book-1",
    cover_local_path: "",
    cover_url: "",
    deadline: "2026-03-20",
    difficulty: 3,
    finished_at: null,
    lookup_note: "",
    max_minutes_per_day: null,
    min_blocks_per_session: 1,
    pages_read: null,
    pages_total: 10,
    priority: 3,
    progress_percent: 90,
    scheduled_days: ["Mon"],
    shelf: "",
    status: "in_progress",
    title: "Book",
    words_total: 1000,
};

function book(overrides = {}) {
    return { ...DEFAULT_BOOK, ...overrides };
}

test("toPayloadBook mirrors words_total to words_full for planner payloads", () => {
    const PAYLOAD = toPayloadBook(book());

    assert.equal(PAYLOAD.words_total, 1000);
    assert.equal(PAYLOAD.words_full, 1000);
});

test("toPayloadBook treats 100 percent progress as read", () => {
    const PAYLOAD = toPayloadBook(
        book({ progress_percent: 100, status: "in_progress" }),
    );

    assert.equal(PAYLOAD.status, "read");
});
