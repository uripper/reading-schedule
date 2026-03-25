// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { hydrateBookCover } from "../dist/renderer/books/save.js";

const BASE_BOOK = {
    book_id: "book-1",
    cover_local_path: "",
    cover_url: "https://example.com/cover.jpg",
};

function restorePlannerApi(previousPlannerApi) {
    if (previousPlannerApi === undefined) {
        delete globalThis.plannerApi;
        return;
    }
    globalThis.plannerApi = previousPlannerApi;
}

async function withPlannerApi(downloadCover, action) {
    const ORIGINAL_PLANNER_API = globalThis.plannerApi;
    globalThis.plannerApi = { downloadCover };
    try {
        return await action();
    } finally {
        restorePlannerApi(ORIGINAL_PLANNER_API);
    }
}

function installTimeoutHarness() {
    const ORIGINAL_SET_TIMEOUT = globalThis.setTimeout;
    const ORIGINAL_CLEAR_TIMEOUT = globalThis.clearTimeout;
    const STATE = {
        clearedTimeoutId: null,
        timeoutCallback: null,
    };
    globalThis.setTimeout = (callback) => {
        STATE.timeoutCallback = callback;
        return 77;
    };
    globalThis.clearTimeout = (timeoutId) => {
        STATE.clearedTimeoutId = timeoutId;
    };
    return {
        restore() {
            globalThis.setTimeout = ORIGINAL_SET_TIMEOUT;
            globalThis.clearTimeout = ORIGINAL_CLEAR_TIMEOUT;
        },
        state: STATE,
    };
}

test("hydrateBookCover returns a cloned book with the downloaded cover path", async () => {
    await withPlannerApi(
        () => Promise.resolve("/tmp/cover.jpg"),
        async () => {
            const RESULT = await hydrateBookCover(BASE_BOOK);

            assert.notEqual(RESULT, BASE_BOOK);
            assert.equal(RESULT.cover_local_path, "/tmp/cover.jpg");
            assert.equal(RESULT.cover_url, BASE_BOOK.cover_url);
        },
    );
});

test("hydrateBookCover falls back to the original book when cover download times out", async () => {
    const HARNESS = installTimeoutHarness();
    try {
        await withPlannerApi(
            async () => {
                return await new Promise((_resolve, _reject) => {
                    return undefined;
                });
            },
            async () => {
                const RESULT_PROMISE = hydrateBookCover(BASE_BOOK);
                assert.equal(typeof HARNESS.state.timeoutCallback, "function");
                HARNESS.state.timeoutCallback();
                const RESULT = await RESULT_PROMISE;

                assert.equal(RESULT, BASE_BOOK);
                assert.equal(HARNESS.state.clearedTimeoutId, 77);
            },
        );
    } finally {
        HARNESS.restore();
    }
});
