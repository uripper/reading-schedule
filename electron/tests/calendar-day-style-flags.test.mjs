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
  const flags = dayStyleFlags(
    day("2026-02-21"),
    day("2026-02-01"),
    "2026-02-21",
    "2026-02-21",
    "2026-02-21",
    [{ finish: false }],
  );

  assert.equal(flags.isToday, true);
  assert.equal(flags.isPast, false);
  assert.equal(flags.isSelected, true);
  assert.equal(flags.isMuted, false);
});

test("dayStyleFlags marks non-month cells as muted", () => {
  const flags = dayStyleFlags(
    day("2026-01-31"),
    day("2026-02-01"),
    "2026-01-31",
    "2026-02-02",
    "2026-02-21",
    [{ finish: true }],
  );

  assert.equal(flags.isMuted, true);
  assert.equal(flags.hasFinishRow, true);
});
