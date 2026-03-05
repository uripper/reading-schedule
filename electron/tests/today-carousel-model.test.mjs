import assert from "node:assert/strict";
import test from "node:test";

import { buildTodayCarouselModel } from "../dist/renderer/app/today/today_carousel_model.js";
import { sessionKeyFor } from "../dist/renderer/calendar/utils.js";
import { todayKey } from "../dist/renderer/sessions/utils.js";

const CREATED_AT = "2026-01-01T00:00:00.000Z";

function row(args) {
    return {
        book_id: args.bookId,
        date: args.date,
        minutes: args.minutes,
        session_index: args.sessionIndex,
        title: args.title,
        words_planned: args.minutes * 100,
    };
}

function plannerResult(schedule) {
    return {
        created_at: CREATED_AT,
        schedule,
        summary: {
            per_book: {},
            total_available_minutes: 0,
            total_planned_minutes: 0,
        },
    };
}

test("buildTodayCarouselModel groups only today's rows and attaches metadata", () => {
    const TODAY = todayKey();
    const TOMORROW = "2099-01-01";
    const ROW_A = row({
        bookId: "book-1",
        date: TODAY,
        minutes: 20,
        sessionIndex: 1,
        title: "Today One",
    });
    const ROW_B = row({
        bookId: "book-1",
        date: TODAY,
        minutes: 25,
        sessionIndex: 2,
        title: "Today One",
    });
    const ROW_C = row({
        bookId: "book-2",
        date: TODAY,
        minutes: 30,
        sessionIndex: 1,
        title: "Today Two",
    });
    const TOMORROW_ROW = row({
        bookId: "book-3",
        date: TOMORROW,
        minutes: 15,
        sessionIndex: 1,
        title: "Tomorrow",
    });

    const MODEL = buildTodayCarouselModel({
        books: [
            {
                author: "Author One",
                book_id: "book-1",
                cover_local_path: null,
                cover_url: "https://example.com/cover-1.jpg",
                progress_percent: 10,
            },
            {
                author: "Author Two",
                book_id: "book-2",
                cover_local_path: "/tmp/cover-2.jpg",
                cover_url: "",
                progress_percent: 40,
            },
        ],
        lastResult: plannerResult([ROW_A, ROW_B, ROW_C, TOMORROW_ROW]),
        pinnedRowKeyByBookId: {},
        scheduleCompletions: {
            [sessionKeyFor(ROW_A)]: true,
        },
        selectedBookId: "book-2",
    });

    assert.equal(MODEL.books.length, 2);
    assert.equal(MODEL.selectedBookId, "book-2");
    assert.equal(MODEL.active?.book.bookId, "book-2");
    assert.equal(MODEL.books[0].author.length > 0, true);
    assert.equal(MODEL.books[0].coverSrc.length > 0, true);
});

test("buildTodayCarouselModel uses pinned target row when pinned row exists", () => {
    const TODAY = todayKey();
    const ROW_ONE = row({
        bookId: "book-1",
        date: TODAY,
        minutes: 10,
        sessionIndex: 1,
        title: "Pinned",
    });
    const ROW_TWO = row({
        bookId: "book-1",
        date: TODAY,
        minutes: 15,
        sessionIndex: 2,
        title: "Pinned",
    });

    const MODEL = buildTodayCarouselModel({
        books: [
            {
                author: "Author One",
                book_id: "book-1",
                progress_percent: 5,
            },
        ],
        lastResult: plannerResult([ROW_ONE, ROW_TWO]),
        pinnedRowKeyByBookId: {
            "book-1": sessionKeyFor(ROW_TWO),
        },
        scheduleCompletions: {},
        selectedBookId: "book-1",
    });

    assert.equal(MODEL.books[0].targetRow.rowKey, sessionKeyFor(ROW_TWO));
});

test("buildTodayCarouselModel falls back to next incomplete row when pinned row is missing", () => {
    const TODAY = todayKey();
    const ROW_ONE = row({
        bookId: "book-1",
        date: TODAY,
        minutes: 10,
        sessionIndex: 1,
        title: "Fallback",
    });
    const ROW_TWO = row({
        bookId: "book-1",
        date: TODAY,
        minutes: 15,
        sessionIndex: 2,
        title: "Fallback",
    });

    const MODEL = buildTodayCarouselModel({
        books: [
            {
                author: "Author One",
                book_id: "book-1",
                progress_percent: 5,
            },
        ],
        lastResult: plannerResult([ROW_ONE, ROW_TWO]),
        pinnedRowKeyByBookId: {
            "book-1": "missing-row-key",
        },
        scheduleCompletions: {
            [sessionKeyFor(ROW_ONE)]: true,
        },
        selectedBookId: "book-1",
    });

    assert.equal(MODEL.books[0].targetRow.rowKey, sessionKeyFor(ROW_TWO));
});
