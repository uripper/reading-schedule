// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
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
 * @param {string} bookId - Stable fake `book_id`.
 * @param {() - => {top: number, left: number, bottom: number, right: number}} rectProvider Bounds provider.
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
 * @param {Array<(time: number) => void>} frameQueue - Queued frame callbacks.
 */
function runNextAnimationFrame(frameQueue) {
    const CALLBACK = frameQueue.shift();
    assert.equal(typeof CALLBACK, "function");
    if (typeof CALLBACK === "function") {
        CALLBACK(0);
    }
}

function inViewRect() {
    return {
        bottom: 240,
        left: 20,
        right: 320,
        top: 120,
    };
}

function captureScrollEnvironment() {
    return {
        clearTimeout: globalThis.clearTimeout,
        document: globalThis.document,
        innerHeight: globalThis.innerHeight,
        innerWidth: globalThis.innerWidth,
        requestAnimationFrame: globalThis.requestAnimationFrame,
        setTimeout: globalThis.setTimeout,
    };
}

function installDocumentAndViewport(cards) {
    globalThis.document = {
        querySelectorAll() {
            return cards;
        },
    };
    globalThis.innerHeight = 900;
    globalThis.innerWidth = 1400;
}

function installAnimationFrames(frameQueue) {
    if (frameQueue !== null) {
        globalThis.requestAnimationFrame = (callback) => {
            frameQueue.push(callback);
            return frameQueue.length;
        };
    }
}

function installTimers() {
    const PENDING_TIMERS = new Map();
    let nextTimerId = 0;
    globalThis.setTimeout = (callback) => {
        nextTimerId += 1;
        PENDING_TIMERS.set(nextTimerId, callback);
        return nextTimerId;
    };
    globalThis.clearTimeout = (timerId) => {
        PENDING_TIMERS.delete(timerId);
    };
    return PENDING_TIMERS;
}

function installScrollEnvironment(cards, frameQueue = null) {
    const ORIGINALS = captureScrollEnvironment();
    installDocumentAndViewport(cards);
    installAnimationFrames(frameQueue);
    const PENDING_TIMERS = installTimers();
    return {
        pendingTimers: PENDING_TIMERS,
        restore() {
            globalThis.clearTimeout = ORIGINALS.clearTimeout;
            globalThis.document = ORIGINALS.document;
            globalThis.innerHeight = ORIGINALS.innerHeight;
            globalThis.innerWidth = ORIGINALS.innerWidth;
            globalThis.requestAnimationFrame = ORIGINALS.requestAnimationFrame;
            globalThis.setTimeout = ORIGINALS.setTimeout;
        },
    };
}

function runResetTimer(pendingTimers) {
    const RESET_TIMER = pendingTimers.get(1);
    assert.equal(typeof RESET_TIMER, "function");
    if (typeof RESET_TIMER === "function") {
        RESET_TIMER();
    }
}

function assertNotHighlighted(card) {
    assert.equal(card.classList.contains("is-after-target"), false);
}

function settlingRects() {
    return [
        { bottom: 1320, left: 0, right: 320, top: 1200 },
        { bottom: 800, left: 0, right: 320, top: 680 },
        { bottom: 540, left: 0, right: 320, top: 420 },
        { bottom: 380, left: 0, right: 320, top: 260 },
        { bottom: 300, left: 0, right: 320, top: 180 },
        { bottom: 300, left: 0, right: 320, top: 180 },
        { bottom: 300, left: 0, right: 320, top: 180 },
        { bottom: 300, left: 0, right: 320, top: 180 },
    ];
}

function runFramesWithPendingHighlight(frameQueue, card, count) {
    for (let index = 0; index < count; index += 1) {
        runNextAnimationFrame(frameQueue);
        assertNotHighlighted(card);
    }
}

test("scrollToBookCard highlights immediately when card is already visible", () => {
    const TARGET_CARD = fakeCard("book-b", inViewRect);
    const FIRST_CARD = fakeCard("book-a", inViewRect);
    const ENVIRONMENT = installScrollEnvironment([FIRST_CARD, TARGET_CARD]);
    try {
        scrollToBookCard("book-b");
        assert.equal(TARGET_CARD.scrollCalls, 0);
        assert.equal(TARGET_CARD.classList.contains("is-after-target"), true);
        runResetTimer(ENVIRONMENT.pendingTimers);
        assert.equal(TARGET_CARD.classList.contains("is-after-target"), false);
    } finally {
        ENVIRONMENT.restore();
    }
});

test("scrollToBookCard waits for scrolling to settle before highlighting", () => {
    const RECTS = settlingRects();
    let rectIndex = 0;
    const TARGET_CARD = fakeCard("book-b", () => {
        const RECT = RECTS[Math.min(rectIndex, RECTS.length - 1)];
        rectIndex += 1;
        return RECT;
    });
    const FIRST_CARD = fakeCard("book-a", () => RECTS[0]);
    const FRAME_QUEUE = [];
    const ENVIRONMENT = installScrollEnvironment(
        [FIRST_CARD, TARGET_CARD],
        FRAME_QUEUE,
    );
    try {
        scrollToBookCard("book-b");
        assert.equal(TARGET_CARD.scrollCalls, 1);
        assertNotHighlighted(TARGET_CARD);
        runFramesWithPendingHighlight(FRAME_QUEUE, TARGET_CARD, 5);
        runNextAnimationFrame(FRAME_QUEUE);
        assert.equal(TARGET_CARD.classList.contains("is-after-target"), true);
    } finally {
        ENVIRONMENT.restore();
    }
});
