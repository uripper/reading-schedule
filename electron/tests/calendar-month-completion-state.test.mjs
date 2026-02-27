import test from "node:test";
import assert from "node:assert/strict";

import { rowsWithCompletionState } from "../dist/renderer/calendar/month.js";

test("rowsWithCompletionState marks only past/today rows as completed", () => {
  const rows = [
    { book_id: "book-1", date: "2026-02-09", session_index: 1 },
    { book_id: "book-2", date: "2026-02-10", session_index: 1 },
    { book_id: "book-3", date: "2026-02-11", session_index: 1 },
  ];
  let completionChecks = 0;

  const out = rowsWithCompletionState(rows, "2026-02-10", () => {
    completionChecks += 1;
    return true;
  });

  assert.equal(out[0]?.completed, true);
  assert.equal(out[1]?.completed, true);
  assert.equal(out[2]?.completed, false);
  assert.equal(completionChecks, 2);
});

test("rowsWithCompletionState keeps rows incomplete when identity is missing", () => {
  const rows = [
    { date: "2026-02-10", session_index: 1 },
    { book_id: "book-1", date: "2026-02-10" },
  ];
  let completionChecks = 0;

  const out = rowsWithCompletionState(rows, "2026-02-10", () => {
    completionChecks += 1;
    return true;
  });

  assert.equal(out[0]?.completed, false);
  assert.equal(out[1]?.completed, false);
  assert.equal(completionChecks, 0);
});
