import test from "node:test";
import assert from "node:assert/strict";

import { shouldKeepPickerOpen } from "../dist/renderer/books/after_book_picker_helpers.js";

test("shouldKeepPickerOpen keeps picker open for input interaction", () => {
  assert.equal(
    shouldKeepPickerOpen({
      targetIsInput: true,
      targetIsInResults: false,
    }),
    true,
  );
});

test("shouldKeepPickerOpen keeps picker open for result interaction", () => {
  assert.equal(
    shouldKeepPickerOpen({
      targetIsInput: false,
      targetIsInResults: true,
    }),
    true,
  );
});

test("shouldKeepPickerOpen closes picker for outside interaction", () => {
  assert.equal(
    shouldKeepPickerOpen({
      targetIsInput: false,
      targetIsInResults: false,
    }),
    false,
  );
});
