/** Covers displaying, unlinking, and restoring synced source links in book details. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import {
    configureSyncLinks,
    renderSyncLinks,
} from "../dist/renderer/sync/links-panel.js";
import { installFakeDom } from "./helpers/fake-dom.mjs";

const FIRST = {
    author: "Ursula K. Le Guin",
    dateLastRead: "2026-02-01T12:00:00Z",
    deviceId: "N418A",
    percentRead: 40,
    provider: "kobo",
    sourceId: "earthsea",
    title: "A Wizard of Earthsea",
};
const SECOND = { ...FIRST, deviceId: "N418B", percentRead: 60 };

function linkedBook() {
    return normalizeBook({
        book_id: "earthsea",
        progress_percent: 60,
        progress_updated_at: SECOND.dateLastRead,
        sync_links: [FIRST, SECOND],
        title: "Earthsea",
    });
}

/** Mirrors the nested host for synced sources in the shared shell. */
function optionsSection(dom) {
    const OPTIONS = dom.createElement("details", "bookOptionsSection");
    OPTIONS.append(dom.createElement("section", "bookSyncLinks"));
    document.body.append(OPTIONS);
    return OPTIONS;
}

/** Models the library store and the book form that hosts the panel. */
function setup(t, saveOk = true) {
    const DOM = installFakeDom();
    t.after(() => {
        DOM.restore();
    });
    const OPTIONS = optionsSection(DOM);
    const STATE = { books: [linkedBook()], changed: 0, saved: 0 };
    configureSyncLinks(
        {
            changed: () => {
                STATE.changed += 1;
            },
            flush: async () => await Promise.resolve(true),
            getBooks: () => STATE.books,
            replaceBooks: (books) => {
                STATE.books = books;
            },
            save: async () => {
                STATE.saved += 1;
                return await Promise.resolve(saveOk);
            },
        },
        async () => await Promise.resolve(true),
    );
    return { options: OPTIONS, state: STATE };
}

function panel() {
    return document.getElementById("bookSyncLinks");
}

async function settle() {
    await new Promise((resolve) => {
        setImmediate(resolve);
    });
}

test("source cards start collapsed on every book opening", (t) => {
    const { state: STATE } = setup(t);
    renderSyncLinks(STATE.books[0]);
    const DETAILS = panel().querySelector("details");
    assert.equal(DETAILS.open, false);
    assert.equal(
        DETAILS.querySelector("summary").querySelector("h3").textContent,
        "Synced sources",
    );
    DETAILS.open = true;
    renderSyncLinks(STATE.books[0]);
    assert.equal(panel().querySelector("details").open, false);
});

test("each link shows its provider, device, source book, and reading state", (t) => {
    const { options: OPTIONS, state: STATE } = setup(t);
    renderSyncLinks(STATE.books[0]);
    assert.equal(panel().hidden, false);
    assert.equal(OPTIONS.children[0], panel());
    const ITEMS = panel().querySelectorAll("li");
    assert.equal(ITEMS.length, 2);
    assert.equal(
        ITEMS[0].querySelector(".sync-link-source").textContent,
        "Kobo (N418A)",
    );
    assert.equal(
        ITEMS[0].querySelector(".sync-link-title").textContent,
        "A Wizard of Earthsea — Ursula K. Le Guin",
    );
    const DETAILS = ITEMS[0].querySelector(".sync-link-details");
    assert.equal(DETAILS.children[0].textContent, "40% read");
    assert.match(DETAILS.children[1].textContent, /Last read .+2026/);
    assert.equal(ITEMS[0].querySelector("small"), null);
    assert.equal(ITEMS[0].children.length, 4);
});

test("new and bulk forms hide synced sources, and unlinked books show the empty state", (t) => {
    setup(t);
    renderSyncLinks(null);
    assert.equal(panel().hidden, true);
    renderSyncLinks(normalizeBook({ book_id: "plain", title: "Plain" }));
    assert.equal(panel().hidden, false);
    const DETAILS = panel().querySelector("details");
    assert.equal(DETAILS.open, true);
    assert.equal(DETAILS.querySelector("p").textContent, "No synced sources");
});

test("unlinking removes one device's link and keeps the book and its history", async (t) => {
    const { state: STATE } = setup(t);
    const BEFORE = STATE.books[0];
    renderSyncLinks(BEFORE);
    panel().querySelectorAll("button")[0].click();
    await settle();
    const AFTER = STATE.books[0];
    assert.equal(STATE.saved, 1);
    assert.equal(STATE.changed, 1);
    assert.deepEqual(AFTER.sync_links, [SECOND]);
    assert.equal(AFTER.progress_percent, BEFORE.progress_percent);
    assert.equal(AFTER.progress_updated_at, BEFORE.progress_updated_at);
    assert.equal(panel().querySelectorAll("li").length, 1);
    assert.equal(panel().querySelector("details").open, true);
    assert.match(
        panel().querySelector("p").textContent,
        /Unlinked Kobo \(N418A\)/,
    );
});

test("removing the last link drops the field but confirms the change", async (t) => {
    const { state: STATE } = setup(t);
    STATE.books = [{ ...linkedBook(), sync_links: [FIRST] }];
    renderSyncLinks(STATE.books[0]);
    panel().querySelectorAll("button")[0].click();
    await settle();
    assert.equal("sync_links" in STATE.books[0], false);
    assert.equal(panel().hidden, false);
    assert.equal(panel().querySelectorAll("li").length, 0);
});

test("a failed save restores the link and explains how to retry", async (t) => {
    const { state: STATE } = setup(t, false);
    renderSyncLinks(STATE.books[0]);
    panel().querySelectorAll("button")[0].click();
    await settle();
    assert.deepEqual(STATE.books[0].sync_links, [FIRST, SECOND]);
    assert.match(panel().querySelector("p").textContent, /restored; retry/);
});
