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

test("book cards render stacked edit and remove actions", () => {
    const ENVIRONMENT = installFakeDom();
    try {
        const ROOT = ENVIRONMENT.createElement("div");
        const CARD = createCardNode(bookFixture(), cardContext());
        ROOT.append(CARD);
        const EDITED = [];
        const REMOVED = [];
        bindCardEvents(ROOT, {
            onEdit(bookId) {
                EDITED.push(bookId);
            },
            onRemove(bookId) {
                REMOVED.push(bookId);
            },
        });

        const STACK = CARD.querySelector(".book-card-command-stack");
        const EDIT_BUTTON = STACK.querySelector(".edit-book-btn");
        const REMOVE_BUTTON = STACK.querySelector(".remove-book-btn");
        const COVER_BUTTON = CARD.querySelector(".book-cover-btn");

        assert.equal(STACK.children[0], EDIT_BUTTON);
        assert.equal(STACK.children[1], REMOVE_BUTTON);
        EDIT_BUTTON.click();
        COVER_BUTTON.click();
        REMOVE_BUTTON.click();

        assert.deepEqual(EDITED, [BOOK_ID, BOOK_ID]);
        assert.deepEqual(REMOVED, [BOOK_ID]);
    } finally {
        ENVIRONMENT.restore();
    }
});
