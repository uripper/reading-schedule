import test from "node:test";
import assert from "node:assert/strict";

import {
  completeFocusSession,
  completeTinyStart,
  createClosedFocusState,
  exitFocusMode,
  focusSessionFromRow,
  openFocusMode,
  startFocusSession,
} from "../dist/renderer/app/today_focus.js";

test("today focus flow supports start, complete, and exit", () => {
  const session = focusSessionFromRow({
    date: "2026-02-21",
    session_index: 1,
    book_id: "book-1",
    title: "Ulysses",
    minutes: 25,
    words_planned: 2500,
  });
  let state = openFocusMode(session);
  assert.equal(state.isOpen, true);
  assert.equal(state.isStarted, false);

  state = startFocusSession(state);
  assert.equal(state.isStarted, true);
  assert.match(state.feedback, /Started "Ulysses"/);

  state = completeFocusSession(state);
  assert.equal(state.isStarted, false);
  assert.match(state.feedback, /Completed "Ulysses"/);

  state = exitFocusMode(state);
  assert.equal(state.isOpen, false);
  assert.equal(state.feedback, "");
});

test("today focus tiny start provides explicit feedback", () => {
  let state = createClosedFocusState();
  state = openFocusMode(null);
  state = completeTinyStart(state, 3);
  assert.equal(state.isStarted, false);
  assert.equal(state.feedback, "Tiny Start complete: 3 minutes done.");
});

test("today focus start guards when no session exists", () => {
  let state = openFocusMode(null);
  state = startFocusSession(state);
  assert.equal(state.isStarted, false);
  assert.equal(state.feedback, "No upcoming session to start right now.");
});
