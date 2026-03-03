import assert from "node:assert/strict";
import test from "node:test";

import { navigateToTodayBook } from "../dist/renderer/app/today/today_books_navigation.js";

test("navigateToTodayBook activates Books and scrolls in animation frame", () => {
    let activateCount = 0;
    let scrolledBookId = "";
    const QUEUED_FRAMES = [];

    const ORIGINAL_REQUEST_ANIMATION_FRAME = globalThis.requestAnimationFrame;
    try {
        globalThis.requestAnimationFrame = (callback) => {
            QUEUED_FRAMES.push(callback);
            return QUEUED_FRAMES.length;
        };

        navigateToTodayBook("  book-123  ", {
            activateBooksTab() {
                activateCount += 1;
            },
            scrollToBook(bookId) {
                scrolledBookId = bookId;
            },
        });

        assert.equal(activateCount, 1);
        assert.equal(scrolledBookId, "");
        assert.equal(QUEUED_FRAMES.length, 1);

        QUEUED_FRAMES[0](0);
        assert.equal(scrolledBookId, "book-123");
    } finally {
        globalThis.requestAnimationFrame = ORIGINAL_REQUEST_ANIMATION_FRAME;
    }
});

test("navigateToTodayBook ignores blank ids", () => {
    let activateCount = 0;
    let scrollCount = 0;
    const QUEUED_FRAMES = [];

    const ORIGINAL_REQUEST_ANIMATION_FRAME = globalThis.requestAnimationFrame;
    try {
        globalThis.requestAnimationFrame = (callback) => {
            QUEUED_FRAMES.push(callback);
            return QUEUED_FRAMES.length;
        };

        navigateToTodayBook("   ", {
            activateBooksTab() {
                activateCount += 1;
            },
            scrollToBook() {
                scrollCount += 1;
            },
        });

        assert.equal(activateCount, 0);
        assert.equal(scrollCount, 0);
        assert.equal(QUEUED_FRAMES.length, 0);
    } finally {
        globalThis.requestAnimationFrame = ORIGINAL_REQUEST_ANIMATION_FRAME;
    }
});
