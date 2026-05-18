// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { bindCardEvents } from "../dist/renderer/books/card_events.js";
import { createCardNode } from "../dist/renderer/books/card_nodes.js";
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

function cardContext() {
    return {
        finishDateByBookId: { [BOOK_ID]: FINISH_DATE },
        onEstimatedFinishNavigate() {
            return undefined;
        },
        showBlockerMeta: false,
        showShelfMeta: false,
        showWordCount: false,
        titleById: {},
    };
}

function renderedCard(environment) {
    const ROOT = environment.createElement("div");
    const CARD = createCardNode(bookFixture(), cardContext());
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
