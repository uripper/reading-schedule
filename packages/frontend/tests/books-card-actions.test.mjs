import assert from "node:assert/strict";
import test from "node:test";

import { createCardNode } from "../dist/renderer/books/card-nodes.js";
import { bindCardEvents } from "../dist/renderer/books/card_events.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const BOOK_ID = "book-1";
const FINISH_DATE = "2026-06-14";

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
    const EVENTS = { edited: [], removed: [] };
    bindCardEvents(root, {
        onEdit(bookId) {
            EVENTS.edited.push(bookId);
        },
        onRemove(bookId) {
            EVENTS.removed.push(bookId);
        },
    });
    return EVENTS;
}

function cardActionNodes(card) {
    const STACK = card.querySelector(".book-card-command-stack");
    return {
        coverButton: card.querySelector(".book-cover-btn"),
        editButton: STACK.querySelector(".edit-book-btn"),
        removeButton: STACK.querySelector(".remove-book-btn"),
        stack: STACK,
    };
}

function clickCardActions(nodes) {
    nodes.editButton.click();
    nodes.coverButton.click();
    nodes.removeButton.click();
}

test("book cards render stacked edit and remove actions", () => {
    const ENVIRONMENT = installFakeDom();
    try {
        const { card, root } = renderedCard(ENVIRONMENT);
        const EVENTS = bindAndCaptureEvents(root);
        const NODES = cardActionNodes(card);
        assert.equal(NODES.stack.children[0], NODES.editButton);
        assert.equal(NODES.stack.children[1], NODES.removeButton);
        clickCardActions(NODES);
        assert.deepEqual(EVENTS.edited, [BOOK_ID, BOOK_ID]);
        assert.deepEqual(EVENTS.removed, [BOOK_ID]);
    } finally {
        ENVIRONMENT.restore();
    }
});

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
        assert.equal(
            BADGE.textContent.includes(`Finished ${FINISH_DATE}`),
            true,
        );
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
        assert.ok(ACTIONS.querySelector(".book-estimated-finish-btn"));
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
            onRemove() {
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
