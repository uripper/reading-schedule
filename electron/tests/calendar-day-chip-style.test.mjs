import test from "node:test";
import assert from "node:assert/strict";

import { chipClassNameForRow } from "../dist/renderer/calendar/month_day_button_chips.js";

test("chipClassNameForRow does not style completed rows in month grid", () => {
  const className = chipClassNameForRow({
    completed: true,
    finish: false,
  });

  assert.equal(className, "day-chip");
});

test("chipClassNameForRow applies finish style for expected finish rows", () => {
  const className = chipClassNameForRow({
    completed: false,
    finish: true,
  });

  assert.equal(className, "day-chip finish");
});

test("chipClassNameForRow keeps base style for normal rows", () => {
  const className = chipClassNameForRow({
    completed: false,
    finish: false,
  });

  assert.equal(className, "day-chip");
});
