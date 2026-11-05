/** Verifies saving books stays independent of remote cover latency and failures. */
import assert from "node:assert/strict";
import test from "node:test";
import { nextBooksAfterDialogSave } from "../dist/renderer/books/controller-save.js";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { hydrateBookCover } from "../dist/renderer/books/save.js";

const BASE_BOOK = normalizeBook({
    book_id: "book-1",
    cover_url: "https://example.com/cover.jpg",
    pages_total: 200,
    title: "Cover test",
});

test("dialog save commits a usable book without invoking slow cover processing", () => {
    const PREVIOUS = globalThis.plannerApi;
    let calls = 0;
    globalThis.plannerApi = {
        downloadCover() {
            calls += 1;
            return Promise.withResolvers().promise;
        },
    };
    try {
        const RESULT = nextBooksAfterDialogSave([], { book: BASE_BOOK });
        assert.equal(RESULT.length, 1);
        assert.equal(RESULT[0].title, BASE_BOOK.title);
        assert.equal(RESULT[0].cover_local_path, "");
        assert.equal(RESULT[0].cover_url, BASE_BOOK.cover_url);
        assert.equal(calls, 0);
    } finally {
        globalThis.plannerApi = PREVIOUS;
    }
});

test("hydration returns a cloned book with a completed remote cover", async () => {
    const PREVIOUS = globalThis.plannerApi;
    globalThis.plannerApi = {
        downloadCover: () => Promise.resolve("/tmp/cover.jpg"),
    };
    try {
        const RESULT = await hydrateBookCover(BASE_BOOK);
        assert.notEqual(RESULT, BASE_BOOK);
        assert.equal(RESULT.cover_local_path, "/tmp/cover.jpg");
    } finally {
        globalThis.plannerApi = PREVIOUS;
    }
});

test("hydration exposes failures to the background recovery path", async () => {
    const PREVIOUS = globalThis.plannerApi;
    globalThis.plannerApi = {
        downloadCover: () => Promise.reject(new Error("decode failed")),
    };
    try {
        await assert.rejects(hydrateBookCover(BASE_BOOK), /decode failed/);
        globalThis.plannerApi.downloadCover = () => Promise.resolve("");
        await assert.rejects(
            hydrateBookCover(BASE_BOOK),
            /Select the cover again/,
        );
    } finally {
        globalThis.plannerApi = PREVIOUS;
    }
});
