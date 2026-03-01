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
    const classes = new Set();
    return {
        add(name) {
            classes.add(name);
        },
        contains(name) {
            return classes.has(name);
        },
        remove(name) {
            classes.delete(name);
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
    const callback = frameQueue.shift();
    assert.equal(typeof callback, "function");
    if (typeof callback === "function") {
        callback(0);
    }
}

test("scrollToBookCard highlights immediately when card is already visible", () => {
    const inViewRect = {
        bottom: 240,
        left: 20,
        right: 320,
        top: 120,
    };
    const targetCard = fakeCard("book-b", () => inViewRect);
    const firstCard = fakeCard("book-a", () => inViewRect);
    const pendingTimers = new Map();
    let nextTimerId = 0;

    const originalDocument = globalThis.document;
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    const originalInnerHeight = globalThis.innerHeight;
    const originalInnerWidth = globalThis.innerWidth;
    try {
        globalThis.document = {
            querySelectorAll() {
                return [firstCard, targetCard];
            },
        };
        globalThis.innerHeight = 900;
        globalThis.innerWidth = 1400;
        globalThis.setTimeout = (callback) => {
            nextTimerId += 1;
            pendingTimers.set(nextTimerId, callback);
            return nextTimerId;
        };
        globalThis.clearTimeout = (timerId) => {
            pendingTimers.delete(timerId);
        };

        scrollToBookCard("book-b");
        assert.equal(targetCard.scrollCalls, 0);
        assert.equal(targetCard.classList.contains("is-after-target"), true);

        const resetTimer = pendingTimers.get(1);
        assert.equal(typeof resetTimer, "function");
        if (typeof resetTimer === "function") {
            resetTimer();
        }
        assert.equal(targetCard.classList.contains("is-after-target"), false);
    } finally {
        globalThis.document = originalDocument;
        globalThis.setTimeout = originalSetTimeout;
        globalThis.clearTimeout = originalClearTimeout;
        globalThis.innerHeight = originalInnerHeight;
        globalThis.innerWidth = originalInnerWidth;
    }
});

test("scrollToBookCard waits for scrolling to settle before highlighting", () => {
    const rects = [
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
    const targetCard = fakeCard("book-b", () => {
        const rect = rects[Math.min(rectIndex, rects.length - 1)];
        rectIndex += 1;
        return rect;
    });
    const firstCard = fakeCard("book-a", () => rects[0]);
    const pendingTimers = new Map();
    let nextTimerId = 0;
    const frameQueue = [];

    const originalDocument = globalThis.document;
    const originalAnimationFrame = globalThis.requestAnimationFrame;
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    const originalInnerHeight = globalThis.innerHeight;
    const originalInnerWidth = globalThis.innerWidth;
    try {
        globalThis.document = {
            querySelectorAll() {
                return [firstCard, targetCard];
            },
        };
        globalThis.innerHeight = 900;
        globalThis.innerWidth = 1400;
        globalThis.requestAnimationFrame = (callback) => {
            frameQueue.push(callback);
            return frameQueue.length;
        };
        globalThis.setTimeout = (callback) => {
            nextTimerId += 1;
            pendingTimers.set(nextTimerId, callback);
            return nextTimerId;
        };
        globalThis.clearTimeout = (timerId) => {
            pendingTimers.delete(timerId);
        };

        scrollToBookCard("book-b");
        assert.equal(targetCard.scrollCalls, 1);
        assert.equal(targetCard.classList.contains("is-after-target"), false);

        runNextAnimationFrame(frameQueue);
        assert.equal(targetCard.classList.contains("is-after-target"), false);

        runNextAnimationFrame(frameQueue);
        assert.equal(targetCard.classList.contains("is-after-target"), false);

        runNextAnimationFrame(frameQueue);
        assert.equal(targetCard.classList.contains("is-after-target"), false);

        runNextAnimationFrame(frameQueue);
        assert.equal(targetCard.classList.contains("is-after-target"), false);

        runNextAnimationFrame(frameQueue);
        assert.equal(targetCard.classList.contains("is-after-target"), false);

        runNextAnimationFrame(frameQueue);
        assert.equal(targetCard.classList.contains("is-after-target"), true);
    } finally {
        globalThis.document = originalDocument;
        globalThis.requestAnimationFrame = originalAnimationFrame;
        globalThis.setTimeout = originalSetTimeout;
        globalThis.clearTimeout = originalClearTimeout;
        globalThis.innerHeight = originalInnerHeight;
        globalThis.innerWidth = originalInnerWidth;
    }
});
