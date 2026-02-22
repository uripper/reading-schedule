import test from "node:test";
import assert from "node:assert/strict";

import { nextRowsWithUpdatedMinutes } from "../dist/renderer/app/calendar_interactions_minutes_rows.js";
import {
  MINUTES_EDITOR_OPEN_BY_DEFAULT,
  nextMinutesEditorOpenState,
  plannedMinutesSummaryText,
} from "../dist/renderer/calendar/details_minutes_form.js";

function row(overrides = {}) {
  return {
    date: "2026-02-21",
    session_index: 2,
    book_id: "book-1",
    title: "Book 1",
    minutes: 10,
    words_planned: 900,
    ...overrides,
  };
}

test("nextRowsWithUpdatedMinutes updates minutes and recomputes planned words", () => {
  const targetRow = row();
  const previousRows = [
    row({
      date: "2026-02-20",
      session_index: 1,
      minutes: 10,
      words_planned: 1000,
    }),
    targetRow,
  ];

  const updated = nextRowsWithUpdatedMinutes({
    collectSettings: () => ({ wpm_base: 240 }),
    getBookById: () => ({ difficulty: 3 }),
    minutes: 20,
    previousRows,
    row: targetRow,
  });

  assert.ok(updated);
  assert.equal(updated.normalizedMinutes, 20);
  const edited = updated.rows.find((entry) => entry.session_index === 2);
  assert.ok(edited);
  assert.equal(edited.minutes, 20);
  assert.equal(edited.words_planned, 2000);
});

test("nextRowsWithUpdatedMinutes returns null when target row is missing", () => {
  const updated = nextRowsWithUpdatedMinutes({
    collectSettings: () => ({ wpm_base: 240 }),
    getBookById: () => ({ difficulty: 3 }),
    minutes: 20,
    previousRows: [],
    row: row(),
  });

  assert.equal(updated, null);
});

test("planned minutes editor starts closed", () => {
  assert.equal(MINUTES_EDITOR_OPEN_BY_DEFAULT, false);
});

test("planned minutes editor opens only after explicit edit action", () => {
  const openFromEdit = nextMinutesEditorOpenState("edit");
  const openFromCancel = nextMinutesEditorOpenState("cancel");
  const openFromSave = nextMinutesEditorOpenState("saved");

  assert.equal(openFromEdit, true);
  assert.equal(openFromCancel, false);
  assert.equal(openFromSave, false);
});

test("plannedMinutesSummaryText renders current planned minutes", () => {
  assert.equal(plannedMinutesSummaryText(25), "25 minutes");
});
