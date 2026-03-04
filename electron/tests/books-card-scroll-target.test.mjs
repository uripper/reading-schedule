import assert from "node:assert/strict";
import test from "node:test";

import { scrollToBookCard } from "../dist/renderer/books/card_scroll_target.js";

/**
 * Builds a minimal fake DOMTokenList backed by a Set.
 * @returns {{
 *   add(name: string): void,
 *   remove(name: string): void,
 *   contains(name: string): boolean
 * }} Minimal classList-compatible helper.
 */
function fakeClassList() {
    const CLASSES = new Set();
    return {
        add(name) {
            CLASSES.add(name);
        },
        contains(name) {
            return CLASSES.has(name);
        },
        remove(name) {
            CLASSES.delete(name);
        },
    };
}

/**
 * Creates a fake card node with the fields used by scroll targeting.
 * @param {string} bookId Stable fake `book_id`.
 * @param {() => {top: number, left: number, bottom: number, right: number}} rectProvider Bounds provider.
 * @returns {{
 *   classList: ReturnType<typeof fakeClassList>,
 *   dataset: { bookId: string },
 *   scrollCalls: number,
 *   scrollIntoView(options: unknown): void,
 *   getBoundingClientRect(): {top: number, left: number, bottom: number, right: number}
 * }} Fake card shape consumed by scroll targeting.
 */
function fakeCard(bookId, rectProvider) {
    return {
        classList: fakeClassList(),
        dataset: { bookId },
        getBoundingClientRect() {
            return rectProvider();
        },
        scrollCalls: 0,
        scrollIntoView() {
            this.scrollCalls += 1;
        },
    };
}

/**
 * Executes the next queued animation-frame callback.
 * @param {Array<(time: number) => void>} frameQueue Queued frame callbacks.
 */
function runNextAnimationFrame(frameQueue) {
    const CALLBACK = frameQueue.shift();
    assert.equal(typeof CALLBACK, "function");
    if (typeof CALLBACK === "function") {
        CALLBACK(0);
    }
}

test("scrollToBookCard highlights immediately when card is already visible", () => {
    const IN_VIEW_RECT = {
        bottom: 240,
        left: 20,
        right: 320,
        top: 120,
    };
    const TARGET_CARD = fakeCard("book-b", () => IN_VIEW_RECT);
    const FIRST_CARD = fakeCard("book-a", () => IN_VIEW_RECT);
    const PENDING_TIMERS = new Map();
    let nextTimerId = 0;

    const ORIGINAL_DOCUMENT = globalThis.document;
    const ORIGINAL_SET_TIMEOUT = globalThis.setTimeout;
    const ORIGINAL_CLEAR_TIMEOUT = globalThis.clearTimeout;
    const ORIGINAL_INNER_HEIGHT = globalThis.innerHeight;
    const ORIGINAL_INNER_WIDTH = globalThis.innerWidth;
    try {
        globalThis.document = {
            querySelectorAll() {
                return [FIRST_CARD, TARGET_CARD];
            },
        };
        globalThis.innerHeight = 900;
        globalThis.innerWidth = 1400;
        globalThis.setTimeout = (callback) => {
            nextTimerId += 1;
            PENDING_TIMERS.set(nextTimerId, callback);
            return nextTimerId;
        };
        globalThis.clearTimeout = (timerId) => {
            PENDING_TIMERS.delete(timerId);
        };

        scrollToBookCard("book-b");
        assert.equal(TARGET_CARD.scrollCalls, 0);
        assert.equal(TARGET_CARD.classList.contains("is-after-target"), true);

        const RESET_TIMER = PENDING_TIMERS.get(1);
        assert.equal(typeof RESET_TIMER, "function");
        if (typeof RESET_TIMER === "function") {
            RESET_TIMER();
        }
        assert.equal(TARGET_CARD.classList.contains("is-after-target"), false);
    } finally {
        globalThis.document = ORIGINAL_DOCUMENT;
        globalThis.setTimeout = ORIGINAL_SET_TIMEOUT;
        globalThis.clearTimeout = ORIGINAL_CLEAR_TIMEOUT;
        globalThis.innerHeight = ORIGINAL_INNER_HEIGHT;
        globalThis.innerWidth = ORIGINAL_INNER_WIDTH;
    }
});

test("scrollToBookCard waits for scrolling to settle before highlighting", () => {
    const RECTS = [
        { bottom: 1320, left: 0, right: 320, top: 1200 },
        { bottom: 800, left: 0, right: 320, top: 680 },
        { bottom: 540, left: 0, right: 320, top: 420 },
        { bottom: 380, left: 0, right: 320, top: 260 },
        { bottom: 300, left: 0, right: 320, top: 180 },
        { bottom: 300, left: 0, right: 320, top: 180 },
        { bottom: 300, left: 0, right: 320, top: 180 },
        { bottom: 300, left: 0, right: 320, top: 180 },
    ];
    let rectIndex = 0;
    const TARGET_CARD = fakeCard("book-b", () => {
        const RECT = RECTS[Math.min(rectIndex, RECTS.length - 1)];
        rectIndex += 1;
        return RECT;
    });
    const FIRST_CARD = fakeCard("book-a", () => RECTS[0]);
    const PENDING_TIMERS = new Map();
    let nextTimerId = 0;
    const FRAME_QUEUE = [];

    const ORIGINAL_DOCUMENT = globalThis.document;
    const ORIGINAL_ANIMATION_FRAME = globalThis.requestAnimationFrame;
    const ORIGINAL_SET_TIMEOUT = globalThis.setTimeout;
    const ORIGINAL_CLEAR_TIMEOUT = globalThis.clearTimeout;
    const ORIGINAL_INNER_HEIGHT = globalThis.innerHeight;
    const ORIGINAL_INNER_WIDTH = globalThis.innerWidth;
    try {
        globalThis.document = {
            querySelectorAll() {
                return [FIRST_CARD, TARGET_CARD];
            },
        };
        globalThis.innerHeight = 900;
        globalThis.innerWidth = 1400;
        globalThis.requestAnimationFrame = (callback) => {
            FRAME_QUEUE.push(callback);
            return FRAME_QUEUE.length;
        };
        globalThis.setTimeout = (callback) => {
            nextTimerId += 1;
            PENDING_TIMERS.set(nextTimerId, callback);
            return nextTimerId;
        };
        globalThis.clearTimeout = (timerId) => {
            PENDING_TIMERS.delete(timerId);
        };

        scrollToBookCard("book-b");
        assert.equal(TARGET_CARD.scrollCalls, 1);
        assert.equal(TARGET_CARD.classList.contains("is-after-target"), false);

        runNextAnimationFrame(FRAME_QUEUE);
        assert.equal(TARGET_CARD.classList.contains("is-after-target"), false);

        runNextAnimationFrame(FRAME_QUEUE);
        assert.equal(TARGET_CARD.classList.contains("is-after-target"), false);

        runNextAnimationFrame(FRAME_QUEUE);
        assert.equal(TARGET_CARD.classList.contains("is-after-target"), false);

        runNextAnimationFrame(FRAME_QUEUE);
        assert.equal(TARGET_CARD.classList.contains("is-after-target"), false);

        runNextAnimationFrame(FRAME_QUEUE);
        assert.equal(TARGET_CARD.classList.contains("is-after-target"), false);

        runNextAnimationFrame(FRAME_QUEUE);
        assert.equal(TARGET_CARD.classList.contains("is-after-target"), true);
    } finally {
        globalThis.document = ORIGINAL_DOCUMENT;
        globalThis.requestAnimationFrame = ORIGINAL_ANIMATION_FRAME;
        globalThis.setTimeout = ORIGINAL_SET_TIMEOUT;
        globalThis.clearTimeout = ORIGINAL_CLEAR_TIMEOUT;
        globalThis.innerHeight = ORIGINAL_INNER_HEIGHT;
        globalThis.innerWidth = ORIGINAL_INNER_WIDTH;
    }
});
