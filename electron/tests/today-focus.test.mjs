// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";
import {
    clearTodayCarouselRowState,
    closeMinutesEditor,
    minutesEditor,
    openMinutesEditor,
    pinnedRowKeySnapshot,
    pinRowKey,
    progressDraft,
    resetTodayCarouselUiState,
    selectedBookId,
    setMinutesEditorValue,
    setProgressDraft,
    setSelectedBookId,
} from "../dist/renderer/app/today/today_carousel_state.js";

const REMOVED_BOOK_ID = "book-1";
const KEPT_BOOK_ID = "book-2";
const REMOVED_ROW_KEY = "row-1";
const KEPT_ROW_KEY = "row-2";

function draftSnapshot(rowKey) {
    const DRAFT = progressDraft(rowKey);
    assert.notEqual(DRAFT, null);
    return DRAFT;
}

function seedRowState(options) {
    pinRowKey(options.bookId, options.rowKey);
    setProgressDraft({
        pagesText: options.pagesText,
        percentText: options.percentText,
        rowKey: options.rowKey,
    });
}

function assertSinglePinnedRow(bookId, rowKey) {
    assert.deepEqual(pinnedRowKeySnapshot(), {
        [bookId]: rowKey,
    });
}

function assertMinutesEditor(rowKey, valueText) {
    assert.deepEqual(minutesEditor(), {
        rowKey,
        valueText,
    });
}

function assertProgressDraft(rowKey, pagesText, percentText) {
    assert.deepEqual(progressDraft(rowKey), {
        pagesText,
        percentText,
    });
}

test("today carousel state trims keys, clones drafts, and closes the minutes editor", () => {
    resetTodayCarouselUiState();
    setSelectedBookId(` ${REMOVED_BOOK_ID} `);
    seedRowState({
        bookId: ` ${REMOVED_BOOK_ID} `,
        pagesText: " 120 ",
        percentText: " 40 ",
        rowKey: ` ${REMOVED_ROW_KEY} `,
    });
    openMinutesEditor(` ${REMOVED_ROW_KEY} `, " 15 ");
    setMinutesEditorValue(" 20 ");
    assert.equal(selectedBookId(), REMOVED_BOOK_ID);
    assertSinglePinnedRow(REMOVED_BOOK_ID, REMOVED_ROW_KEY);
    const DRAFT = draftSnapshot(REMOVED_ROW_KEY);
    assert.deepEqual(DRAFT, { pagesText: "120", percentText: "40" });
    DRAFT.pagesText = "changed";
    assertProgressDraft(REMOVED_ROW_KEY, "120", "40");
    assertMinutesEditor(REMOVED_ROW_KEY, "20");
    closeMinutesEditor();
    assert.equal(minutesEditor(), null);
});

test("clearTodayCarouselRowState removes only matching row-scoped state", () => {
    resetTodayCarouselUiState();
    seedRowState({
        bookId: REMOVED_BOOK_ID,
        pagesText: "120",
        percentText: "40",
        rowKey: REMOVED_ROW_KEY,
    });
    seedRowState({
        bookId: KEPT_BOOK_ID,
        pagesText: "55",
        percentText: "18",
        rowKey: KEPT_ROW_KEY,
    });
    openMinutesEditor(KEPT_ROW_KEY, "10");
    clearTodayCarouselRowState(REMOVED_BOOK_ID, REMOVED_ROW_KEY);
    assert.equal(progressDraft(REMOVED_ROW_KEY), null);
    assertProgressDraft(KEPT_ROW_KEY, "55", "18");
    assertMinutesEditor(KEPT_ROW_KEY, "10");
    assert.deepEqual(pinnedRowKeySnapshot(), {
        [KEPT_BOOK_ID]: KEPT_ROW_KEY,
    });
});
