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

test("renderTrackState centers the Add Book tile when Today has no books", () => {
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
            const ADD_BOOK = TRACK.children[0];
            assert.ok(ADD_BOOK.classList.contains("btn-add-book"));
            assert.equal(ADD_BOOK.textContent, "Add Book");
        });
    } finally {
        DOM.restore();
    }
});

test("renderTrackState appends the Add Book tile after scheduled covers", () => {
    const DOM = installFakeDom();
    try {
        withFakeAnimationFrame(() => {
            const TRACK = DOM.createElement("div", "todayCarouselTrack");
            DOM.document.body.append(TRACK);
            let addBookCalls = 0;

            renderTrackState(
                {
                    active: null,
                    books: [baseTrackBook()],
                    selectedBookId: "book-1",
                },
                NOOP,
                () => {
                    addBookCalls += 1;
                },
            );

            assert.equal(TRACK.classList.contains("is-add-book-only"), false);
            assert.equal(TRACK.children.length, 2);
            const [COVER, ADD_BOOK] = TRACK.children;
            assert.ok(COVER.classList.contains("is-selected"));
            assert.ok(ADD_BOOK.classList.contains("today-carousel-add-book"));
            ADD_BOOK.click();
            assert.equal(addBookCalls, 1);
        });
    } finally {
        DOM.restore();
    }
});
