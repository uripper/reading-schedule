import test from "node:test";
import assert from "node:assert/strict";

import { dayStyleFlags } from "../dist/renderer/calendar/month_day_button.js";

/**
 * Creates local-midnight date fixture from `YYYY-MM-DD` text.
 * @param {string} dateText Day key text.
 * @returns {Date} Date fixture.
 */
function day(dateText) {
  return new Date(`${dateText}T00:00:00`);
}

test("dayStyleFlags marks today with selection-friendly flags", () => {
  const flags = dayStyleFlags({
    date: day("2026-02-21"),
    firstDate: day("2026-02-01"),
    keyForDay: "2026-02-21",
    selectedDate: "2026-02-21",
    todayKey: "2026-02-21",
    rows: [{ finish: false }],
  });

  assert.equal(flags.isToday, true);
  assert.equal(flags.isPast, false);
  assert.equal(flags.isSelected, true);
  assert.equal(flags.isMuted, false);
});

test("dayStyleFlags marks non-month cells as muted", () => {
  const flags = dayStyleFlags({
    date: day("2026-01-31"),
    firstDate: day("2026-02-01"),
    keyForDay: "2026-01-31",
    selectedDate: "2026-02-02",
    todayKey: "2026-02-21",
    rows: [{ finish: true }],
  });

  assert.equal(flags.isMuted, true);
  assert.equal(flags.hasFinishRow, true);
});

test("dayStyleFlags ignores completed-only rows in month grid", () => {
  const flags = dayStyleFlags({
    date: day("2026-02-20"),
    firstDate: day("2026-02-01"),
    keyForDay: "2026-02-20",
    selectedDate: "2026-02-19",
    todayKey: "2026-02-21",
    rows: [{ completed: true, finish: false }],
  });

  assert.equal(flags.hasFinishRow, false);
});
