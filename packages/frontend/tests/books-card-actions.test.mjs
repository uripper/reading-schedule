import assert from "node:assert/strict";
import test from "node:test";

import { formatFinishDate } from "../dist/renderer/books/card-navigation-buttons.js";
import { createCardNode } from "../dist/renderer/books/card-nodes.js";
import { bindCardEvents } from "../dist/renderer/books/card_events.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const BOOK_ID = "book-1";
const FINISH_DATE = "2026-06-14";
// Built independently of the formatter under test: June is month index 5.
const FINISH_DATE_TEXT = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
}).format(new Date(2026, 5, 14));

function bookFixture() {
    return {
        author: "Yukiko Motoya",
        blocked_by: "",
        book_id: BOOK_ID,
        cover_local_path: "",
        cover_url: "",
        deadline: null,
        lookup_note: "",
        pages_read: 0,
        pages_total: 105,
        progress_percent: 0,
        shelf: "",
        status: "to_read",
        title: "The lonesome bodybuilder",
        words_total: 0,
    };
}

function cardContext(navigatedDates = []) {
    return {
        finishDateByBookId: { [BOOK_ID]: FINISH_DATE },
        onEstimatedFinishNavigate(dateKey) {
            navigatedDates.push(dateKey);
        },
        showBlockerMeta: false,
        showShelfMeta: false,
        showWordCount: false,
        titleById: {},
    };
}

function massEditCardContext() {
    return {
        ...cardContext(),
        massEdit: {
            active: true,
            onBookSelectionChange() {
                return undefined;
            },
            selectedBookIds: new Set([BOOK_ID]),
        },
    };
}

function renderedCard(environment) {
    const ROOT = environment.createElement("div");
    const CARD = createCardNode(bookFixture(), cardContext());
    ROOT.append(CARD);
    return { card: CARD, root: ROOT };
}

function renderedMassEditCard(environment) {
    const ROOT = environment.createElement("div");
    const CARD = createCardNode(bookFixture(), massEditCardContext());
    ROOT.append(CARD);
    return { card: CARD, root: ROOT };
}

function bindAndCaptureEvents(root) {
    const EVENTS = { edited: [] };
    bindCardEvents(root, {
        onEdit(bookId) {
            EVENTS.edited.push(bookId);
        },
    });
    return EVENTS;
}

test("book cards keep Edit as the only command; Remove lives in the dialog", () => {
    const ENVIRONMENT = installFakeDom();
    try {
        const { card, root } = renderedCard(ENVIRONMENT);
        const EVENTS = bindAndCaptureEvents(root);
        const STACK = card.querySelector(".book-card-command-stack");
        const EDIT = STACK.querySelector(".edit-book-btn");
        assert.deepEqual(STACK.children, [EDIT]);
        assert.equal(card.querySelector(".remove-book-btn"), null);
        EDIT.click();
        card.querySelector(".book-cover-btn").click();
        assert.deepEqual(EVENTS.edited, [BOOK_ID, BOOK_ID]);
    } finally {
        ENVIRONMENT.restore();
    }
});

function statLines(card) {
    return card
        .querySelector(".book-stats")
        .children.map((child) => child.textContent);
}

test("to-read cards hide progress; in-progress cards show the bar and pages", () => {
    const ENVIRONMENT = installFakeDom();
    try {
        const TO_READ = createCardNode(bookFixture(), cardContext());
        assert.equal(TO_READ.querySelector(".book-card-progress"), null);
        assert.equal(
            statLines(TO_READ).some((line) => line.includes("%")),
            false,
        );
        const READING = createCardNode(
            {
                ...bookFixture(),
                pages_read: 42,
                progress_percent: 40,
                status: "in_progress",
            },
            cardContext(),
        );
        assert.equal(READING.querySelector(".book-card-progress").value, 40);
        assert.ok(
            statLines(READING).some((line) => line.includes("42/105 pages")),
        );
    } finally {
        ENVIRONMENT.restore();
    }
});

test("the After link is short with the full title in its tooltip", () => {
    const ENVIRONMENT = installFakeDom();
    try {
        const CARD = createCardNode(
            { ...bookFixture(), blocked_by: "book-0" },
            {
                ...cardContext(),
                showBlockerMeta: true,
                titleById: { "book-0": "Dune: Messiah of the Desert" },
            },
        );
        const LINK = CARD.querySelector(".book-after-link-btn");
        assert.equal(LINK.textContent, "After: Dune");
        assert.equal(LINK.title, "After: Dune: Messiah of the Desert");
    } finally {
        ENVIRONMENT.restore();
    }
});

test("finish dates format the day key as a medium local date", () => {
    assert.equal(formatFinishDate(FINISH_DATE), FINISH_DATE_TEXT);
    assert.equal(formatFinishDate("not-a-date"), "not-a-date");
});

test("finish dates read as a US date in an en-US locale", (context) => {
    const LOCALE = new Intl.DateTimeFormat().resolvedOptions().locale;
    if (LOCALE !== "en-US") {
        context.skip(`default locale is ${LOCALE}`);
        return;
    }
    assert.equal(formatFinishDate(FINISH_DATE), "Jun 14, 2026");
});

function chipLines(chip) {
    return chip.children.map((line) => line.textContent);
}

test("read cards show a clickable finished date in the actions row", () => {
    const ENVIRONMENT = installFakeDom();
    try {
        const BOOK = { ...bookFixture(), status: "read" };
        const NAVIGATED_DATES = [];
        const CARD = createCardNode(BOOK, cardContext(NAVIGATED_DATES));
        const ACTIONS = CARD.querySelector(".book-actions");
        const BADGE = ACTIONS.querySelector(".book-finished-btn");
        assert.ok(BADGE);
        BADGE.click();
        assert.deepEqual(NAVIGATED_DATES, [FINISH_DATE]);
        assert.deepEqual(chipLines(BADGE), ["Finished", FINISH_DATE_TEXT]);
        assert.equal(ACTIONS.querySelector(".book-estimated-finish-btn"), null);
        assert.equal(ACTIONS.children[0], BADGE);
    } finally {
        ENVIRONMENT.restore();
    }
});

test("to-read cards show the estimated finish control instead of a badge", () => {
    const ENVIRONMENT = installFakeDom();
    try {
        const CARD = createCardNode(bookFixture(), cardContext());
        const ACTIONS = CARD.querySelector(".book-actions");
        const ESTIMATE = ACTIONS.querySelector(".book-estimated-finish-btn");
        assert.ok(ESTIMATE);
        assert.deepEqual(chipLines(ESTIMATE), [
            "Est. Finish",
            FINISH_DATE_TEXT,
        ]);
        assert.match(ESTIMATE.getAttribute("aria-label"), /14.*2026/u);
        assert.equal(ACTIONS.querySelector(".book-finished-btn"), null);
    } finally {
        ENVIRONMENT.restore();
    }
});

test("mass-edit cards clear selected highlight when a checkbox is unchecked", () => {
    const ENVIRONMENT = installFakeDom();
    try {
        const { card, root } = renderedMassEditCard(ENVIRONMENT);
        bindCardEvents(root, {
            onEdit() {
                return undefined;
            },
            onMassEditSelection() {
                return undefined;
            },
        });
        const CHECKBOX = card.querySelector(".book-mass-select");
        assert.ok(CHECKBOX);
        assert.equal(card.classList.contains("is-mass-selected"), true);
        CHECKBOX.checked = false;
        CHECKBOX.dispatch("change");
        assert.equal(card.classList.contains("is-mass-selected"), false);
    } finally {
        ENVIRONMENT.restore();
    }
});
