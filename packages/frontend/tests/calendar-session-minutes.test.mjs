// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { nextRowsWithUpdatedMinutes } from "../dist/renderer/app/calendar_interactions/calendar_interactions_minutes_rows.js";
import {
    MINUTES_EDITOR_OPEN_BY_DEFAULT,
    minutesSummaryVisible,
    nextMinutesEditorOpenState,
    plannedMinutesSummaryText,
} from "../dist/renderer/calendar/details_minutes_form_helpers.js";

/**
 * Builds schedule row fixture with override support.
 * @param {Record<string, unknown>} overrides - Row field overrides.
 * @returns {Record<string, unknown>} Row fixture.
 */
function row(overrides = {}) {
    return {
        book_id: "book-1",
        date: "2026-02-21",
        minutes: 10,
        session_index: 2,
        title: "Book 1",
        words_planned: 900,
        ...overrides,
    };
}

function updateMinutesArgs(previousRows, targetRow, minutes) {
    return {
        collectSettings: () => ({ wpm_base: 240 }),
        getBookById: () => ({ difficulty: 3 }),
        minutes,
        previousRows,
        row: targetRow,
    };
}

function updatedMinutesResult(previousRows, targetRow, minutes) {
    return nextRowsWithUpdatedMinutes(
        updateMinutesArgs(previousRows, targetRow, minutes),
    );
}

function editedRowAtSessionIndex(updatedResult, sessionIndex) {
    assert.ok(updatedResult);
    return updatedResult.rows.find(
        (entry) => entry.session_index === sessionIndex,
    );
}

test("nextRowsWithUpdatedMinutes updates minutes and recomputes planned words", () => {
    const TARGET_ROW = row();
    const PREVIOUS_ROWS = [
        row({
            date: "2026-02-20",
            minutes: 10,
            session_index: 1,
            words_planned: 1000,
        }),
        TARGET_ROW,
    ];

    const UPDATED = updatedMinutesResult(PREVIOUS_ROWS, TARGET_ROW, 20);

    assert.ok(UPDATED);
    assert.equal(UPDATED.normalizedMinutes, 20);
    const EDITED = editedRowAtSessionIndex(UPDATED, 2);
    assert.ok(EDITED);
    assert.equal(EDITED.minutes, 20);
    assert.equal(EDITED.words_planned, 2000);
});

test("nextRowsWithUpdatedMinutes returns null when target row is missing", () => {
    const UPDATED = updatedMinutesResult([], row(), 20);

    assert.equal(UPDATED, null);
});

test("planned minutes editor starts closed", () => {
    assert.equal(MINUTES_EDITOR_OPEN_BY_DEFAULT, false);
});

test("planned minutes editor opens only after explicit edit action", () => {
    const OPEN_FROM_EDIT = nextMinutesEditorOpenState("edit");
    const OPEN_FROM_CANCEL = nextMinutesEditorOpenState("cancel");
    const OPEN_FROM_SAVE = nextMinutesEditorOpenState("saved");

    assert.equal(OPEN_FROM_EDIT, true);
    assert.equal(OPEN_FROM_CANCEL, false);
    assert.equal(OPEN_FROM_SAVE, false);
});

test("minutes summary visibility mirrors editor open state", () => {
    assert.equal(minutesSummaryVisible(true), false);
    assert.equal(minutesSummaryVisible(false), true);
});

test("plannedMinutesSummaryText renders current planned minutes", () => {
    assert.equal(plannedMinutesSummaryText(25), "25 minutes");
});
