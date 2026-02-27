import test from "node:test";
import assert from "node:assert/strict";

import { navigateToTodayBook } from "../dist/renderer/app/today/today_books_navigation.js";

test("navigateToTodayBook activates Books and scrolls in animation frame", () => {
  let activateCount = 0;
  let scrolledBookId = "";
  const queuedFrames = [];

  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  try {
    globalThis.requestAnimationFrame = (callback) => {
      queuedFrames.push(callback);
      return queuedFrames.length;
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
    assert.equal(queuedFrames.length, 1);

    queuedFrames[0](0);
    assert.equal(scrolledBookId, "book-123");
  } finally {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  }
});

test("navigateToTodayBook ignores blank ids", () => {
  let activateCount = 0;
  let scrollCount = 0;
  const queuedFrames = [];

  const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  try {
    globalThis.requestAnimationFrame = (callback) => {
      queuedFrames.push(callback);
      return queuedFrames.length;
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
    assert.equal(queuedFrames.length, 0);
  } finally {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  }
});
