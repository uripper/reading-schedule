import assert from "node:assert/strict";
import test from "node:test";

import { hydrateBookCover } from "../dist/renderer/books/save.js";

const BASE_BOOK = {
    book_id: "book-1",
    cover_local_path: "",
    cover_url: "https://example.com/cover.jpg",
};

test("hydrateBookCover returns a cloned book with the downloaded cover path", async () => {
    const ORIGINAL_PLANNER_API = globalThis.plannerApi;
    globalThis.plannerApi = {
        downloadCover: () => Promise.resolve("/tmp/cover.jpg"),
    };

    try {
        const RESULT = await hydrateBookCover(BASE_BOOK);

        assert.notEqual(RESULT, BASE_BOOK);
        assert.equal(RESULT.cover_local_path, "/tmp/cover.jpg");
        assert.equal(RESULT.cover_url, BASE_BOOK.cover_url);
    } finally {
        if (ORIGINAL_PLANNER_API === undefined) {
            delete globalThis.plannerApi;
        } else {
            globalThis.plannerApi = ORIGINAL_PLANNER_API;
        }
    }
});

test("hydrateBookCover falls back to the original book when cover download times out", async () => {
    const ORIGINAL_PLANNER_API = globalThis.plannerApi;
    const ORIGINAL_SET_TIMEOUT = globalThis.setTimeout;
    const ORIGINAL_CLEAR_TIMEOUT = globalThis.clearTimeout;
    let timeoutCallback = null;
    let clearedTimeoutId = null;

    globalThis.plannerApi = {
        downloadCover: async () => {
            return await new Promise((_resolve, _reject) => {
                return undefined;
            });
        },
    };
    globalThis.setTimeout = (callback) => {
        timeoutCallback = callback;
        return 77;
    };
    globalThis.clearTimeout = (timeoutId) => {
        clearedTimeoutId = timeoutId;
    };

    try {
        const RESULT_PROMISE = hydrateBookCover(BASE_BOOK);
        assert.equal(typeof timeoutCallback, "function");
        timeoutCallback();
        const RESULT = await RESULT_PROMISE;

        assert.equal(RESULT, BASE_BOOK);
        assert.equal(clearedTimeoutId, 77);
    } finally {
        if (ORIGINAL_PLANNER_API === undefined) {
            delete globalThis.plannerApi;
        } else {
            globalThis.plannerApi = ORIGINAL_PLANNER_API;
        }
        globalThis.setTimeout = ORIGINAL_SET_TIMEOUT;
        globalThis.clearTimeout = ORIGINAL_CLEAR_TIMEOUT;
    }
});
