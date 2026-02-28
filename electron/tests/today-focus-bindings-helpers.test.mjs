import assert from "node:assert/strict";
import test from "node:test";

import {
    findSessionRow,
    nextCompletionsWithRowMarkedComplete,
    tinyStartSessionFromFocus,
} from "../dist/renderer/app/today_focus_bindings_helpers.js";

test("findSessionRow matches using date, id, session index, title, and minutes", () => {
    const row = {
        date: "2026-02-22",
        session_index: 2,
        book_id: "book-1",
        title: "Ulysses",
        minutes: 10,
        words_planned: 1000,
    };
    const matched = findSessionRow(
        {
            schedule: [row],
            summary: null,
            created_at: "",
        },
        {
            bookId: "book-1",
            date: "2026-02-22",
            minutes: 10,
            sessionIndex: 2,
            title: "Ulysses",
        },
    );
    assert.deepEqual(matched, row);
});

test("nextCompletionsWithRowMarkedComplete sets session and day-book keys", () => {
    const row = {
        date: "2026-02-22",
        session_index: 2,
        book_id: "book-1",
        title: "Ulysses",
        minutes: 10,
        words_planned: 1000,
    };
    const completions = nextCompletionsWithRowMarkedComplete({}, row);
    assert.equal(completions["2026-02-22|2|book-1"], true);
    assert.equal(completions["2026-02-22|book-1"], true);
});

test("tinyStartSessionFromFocus logs a manual 3-minute session", () => {
    const session = tinyStartSessionFromFocus({
        bookId: "book-1",
        date: "2026-02-22",
        minutes: 10,
        sessionIndex: 1,
        title: "Ulysses",
    });
    assert.equal(session.source, "manual");
    assert.equal(session.book_id, "book-1");
    assert.equal(session.title, "Ulysses");
    assert.equal(session.minutes, 3);
});
