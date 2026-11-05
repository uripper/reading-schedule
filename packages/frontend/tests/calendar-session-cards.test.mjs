/** Exercises the compact Schedule card editors and completion independently. */
import assert from "node:assert/strict";
import test from "node:test";

import { configureAppCalendarInteractions } from "../dist/renderer/app/calendar_interactions/calendar-interactions.js";
import { withUpdatedProgress } from "../dist/renderer/books/progress.js";
import { buildManualSessionAddPanel } from "../dist/renderer/calendar/details_manual_add.js";
import { minutesFormForSession } from "../dist/renderer/calendar/details_minutes_form.js";
import { buildTodaySessionItem } from "../dist/renderer/calendar/details_session_today.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const ROW = {
    book_id: "book-1",
    date: "2026-11-05",
    finish: true,
    minutes: 30,
    session_index: 1,
    title: "Metaphysics",
    words_planned: 1000,
};

const NOOP = () => undefined;

test("Schedule uses the shared Add Book button for manual sessions", (context) => {
    const DOM = installFakeDom();
    context.after(() => DOM.restore());
    const PANEL = buildManualSessionAddPanel({
        existingBookIds: [],
        interactionHandlers: {
            getBookById: () => null,
            listSessionBooks: () => [{ bookId: ROW.book_id, title: ROW.title }],
        },
    });

    assert.equal(PANEL.querySelector(".btn-add-book").textContent, "Add Book");
});

function calendarHandlers() {
    const STATE = { scheduleCompletions: {} };
    let book = {
        author: "Aristotle",
        book_id: ROW.book_id,
        pages_read: 50,
        pages_total: 200,
        progress_percent: 25,
        status: "in_progress",
        title: ROW.title,
    };
    return configureAppCalendarInteractions({
        applyStateMutation: (mutation) => Object.assign(STATE, mutation),
        configureCalendarInteractions: NOOP,
        getBookById: () => book,
        queuePersist: NOOP,
        setStatus: NOOP,
        state: STATE,
        updateBookProgress: (_id, updates) => {
            book = withUpdatedProgress(book, updates);
            return book;
        },
    });
}

function cardFixture(handlers) {
    return buildTodaySessionItem({
        interactionHandlers: handlers,
        rerenderDetails: NOOP,
        row: ROW,
        state: { rows: [ROW], totalsByBookId: {} },
    });
}

test("the expected finish badge gets its own row in the card header", (context) => {
    const DOM = installFakeDom();
    context.after(() => DOM.restore());
    const CARD = cardFixture(calendarHandlers());
    const BADGE = CARD.querySelector(".day-finish-badge");

    assert.equal(BADGE.textContent, "Expected finish");
    assert.equal(
        BADGE.parentElement,
        CARD.querySelector(".day-session-header"),
    );
});

function editorNodes(form) {
    const INPUT = form.querySelector("input");
    INPUT.select = NOOP;
    return {
        action: form.querySelector(".btn-session-edit"),
        input: INPUT,
        value: form.querySelector(".day-session-metric-value"),
    };
}

function editorEvent(key) {
    return { key, preventDefault: NOOP };
}

test("ending percent edits inline and completion uses its own action", (context) => {
    const DOM = installFakeDom();
    context.after(() => DOM.restore());
    const HANDLERS = calendarHandlers();
    const CARD = cardFixture(HANDLERS);
    const FORM = CARD.querySelector(".day-ending-metric");
    const UNIT = FORM.querySelector("select");
    const { action, input, value } = editorNodes(FORM);

    assert.equal(value.textContent, "200");
    UNIT.value = "percent";
    UNIT.onchange();
    assert.equal(value.textContent, "100%");
    assert.equal(input.hidden, true);
    action.click();
    assert.equal(input.value, "100");
    assert.equal(input.hidden, false);
    assert.equal(value.hidden, true);

    input.value = "60";
    FORM.onsubmit(editorEvent("Enter"));
    assert.equal(value.textContent, "60%");
    assert.equal(input.hidden, true);
    assert.equal(CARD.classList.contains("is-complete"), false);
    assert.deepEqual(HANDLERS.getBookById(ROW.book_id).pages_read, 120);
    assert.equal(HANDLERS.isSessionCompleted("2026-11-05|1|book-1"), false);

    const COMPLETION = CARD.querySelector(".btn-session-completion");
    assert.ok(COMPLETION.classList.contains("btn-complete"));
    assert.equal(COMPLETION.textContent, "Complete session");
    COMPLETION.click();
    assert.equal(HANDLERS.isSessionCompleted("2026-11-05|1|book-1"), true);
});

test("duration editing keeps the label and cancels or saves in place", (context) => {
    const DOM = installFakeDom();
    context.after(() => DOM.restore());
    const SAVES = [];
    const FORM = minutesFormForSession({
        interactionHandlers: {
            onSessionMinutesUpdated: (payload) => {
                SAVES.push(payload.minutes);
                return true;
            },
        },
        rerenderDetails: NOOP,
        row: ROW,
    });
    const { action, input, value } = editorNodes(FORM);

    assert.equal(value.textContent, "30 minutes");
    assert.equal(input.hidden, true);
    action.click();
    assert.equal(input.hidden, false);
    input.value = "42";
    input.onkeydown(editorEvent("Escape"));
    assert.equal(input.hidden, true);
    assert.equal(input.value, "30");
    assert.deepEqual(SAVES, []);

    action.click();
    input.value = "45";
    FORM.onsubmit(editorEvent("Enter"));
    assert.deepEqual(SAVES, [45]);
    assert.equal(input.hidden, true);
});

test("ending page saves the numeric value and leaves the session incomplete", (context) => {
    const DOM = installFakeDom();
    context.after(() => DOM.restore());
    const HANDLERS = calendarHandlers();
    const FORM = cardFixture(HANDLERS).querySelector(".day-ending-metric");
    const { action, input, value } = editorNodes(FORM);

    action.click();
    assert.equal(input.value, "200");
    input.value = "140";
    FORM.onsubmit(editorEvent("Enter"));
    assert.equal(value.textContent, "140");
    assert.equal(HANDLERS.getBookById(ROW.book_id).pages_read, 140);
    assert.equal(HANDLERS.isSessionCompleted("2026-11-05|1|book-1"), false);
});
