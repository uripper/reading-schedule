import assert from "node:assert/strict";
import test from "node:test";

import {
    findSessionRow,
    nextCompletionsWithRowMarkedComplete,
    tinyStartSessionFromFocus,
} from "../dist/renderer/app/today_focus_bindings_helpers.js";

test("findSessionRow matches using date, id, session index, title, and minutes", () => {
    const ROW = {
        book_id: "book-1",
        date: "2026-02-22",
        minutes: 10,
        session_index: 2,
        title: "Ulysses",
        words_planned: 1000,
    };
    const MATCHED = findSessionRow(
        {
            created_at: "",
            schedule: [ROW],
            summary: null,
        },
        {
            bookId: "book-1",
            date: "2026-02-22",
            minutes: 10,
            sessionIndex: 2,
            title: "Ulysses",
        },
    );
    assert.deepEqual(MATCHED, ROW);
});

test("nextCompletionsWithRowMarkedComplete sets session and day-book keys", () => {
    const ROW = {
        book_id: "book-1",
        date: "2026-02-22",
        minutes: 10,
        session_index: 2,
        title: "Ulysses",
        words_planned: 1000,
    };
    const COMPLETIONS = nextCompletionsWithRowMarkedComplete({}, ROW);
    assert.equal(COMPLETIONS["2026-02-22|2|book-1"], true);
    assert.equal(COMPLETIONS["2026-02-22|book-1"], true);
});

test("tinyStartSessionFromFocus logs a manual 3-minute session", () => {
    const SESSION = tinyStartSessionFromFocus({
        bookId: "book-1",
        date: "2026-02-22",
        minutes: 10,
        sessionIndex: 1,
        title: "Ulysses",
    });
    assert.equal(SESSION.source, "manual");
    assert.equal(SESSION.book_id, "book-1");
    assert.equal(SESSION.title, "Ulysses");
    assert.equal(SESSION.minutes, 3);
});
