// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { renderTrackState } from "../dist/renderer/app/today/today_carousel_track_render.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const NOOP = () => undefined;

function withFakeAnimationFrame(work) {
    const ORIGINAL_REQUEST_ANIMATION_FRAME = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (callback) => {
        callback(0);
        return 1;
    };
    try {
        work();
    } finally {
        globalThis.requestAnimationFrame = ORIGINAL_REQUEST_ANIMATION_FRAME;
    }
}

function baseTrackBook(overrides = {}) {
    return {
        author: "Author",
        bookId: "book-1",
        coverSrc: "",
        sessions: [],
        targetRow: null,
        title: "Book 1",
        ...overrides,
    };
}

test("renderTrackState centers the add-book card when Today has no books", () => {
    const DOM = installFakeDom();
    try {
        withFakeAnimationFrame(() => {
            const TRACK = DOM.createElement("div", "todayCarouselTrack");
            DOM.document.body.append(TRACK);

            renderTrackState(
                {
                    active: null,
                    books: [],
                    selectedBookId: "",
                },
                NOOP,
                NOOP,
            );

            assert.equal(TRACK.classList.contains("is-add-book-only"), true);
            assert.equal(TRACK.children.length, 1);
        });
    } finally {
        DOM.restore();
    }
});

test("renderTrackState keeps the regular layout when Today already has books", () => {
    const DOM = installFakeDom();
    try {
        withFakeAnimationFrame(() => {
            const TRACK = DOM.createElement("div", "todayCarouselTrack");
            DOM.document.body.append(TRACK);

            renderTrackState(
                {
                    active: null,
                    books: [baseTrackBook()],
                    selectedBookId: "book-1",
                },
                NOOP,
                NOOP,
            );

            assert.equal(TRACK.classList.contains("is-add-book-only"), false);
            assert.equal(TRACK.children.length, 2);
        });
    } finally {
        DOM.restore();
    }
});