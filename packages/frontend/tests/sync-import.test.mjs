// biome-ignore-all lint/correctness/noUnresolvedImports: Regression tests import built frontend artifacts.
/** Covers durable import success, failure recovery and edits during saves. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";
import { applySyncImport } from "../dist/renderer/sync/import.js";

const SOURCE = {
    dateLastRead: "2026-02-01T12:00:00Z",
    percentRead: 60,
    provider: "kobo",
    sourceId: "source",
    title: "Book",
};
const CHOICES = [{ bookId: "book", record: SOURCE }];

/** Models one durable snapshot write without changing the in-memory library. */
async function saveFixture(state) {
    const STATE = state;
    await Promise.resolve();
    if (STATE.saveOk) {
        STATE.durable = structuredClone(STATE.books);
    }
    return STATE.saveOk;
}

function fixture() {
    const STATE = {
        books: [normalizeBook({ book_id: "book", title: "Book" })],
        changed: 0,
        durable: null,
        flushOk: true,
        saveOk: true,
    };
    const STORE = {
        changed: () => {
            STATE.changed += 1;
        },
        flush: async () => {
            await Promise.resolve();
            return STATE.flushOk;
        },
        getBooks: () => STATE.books,
        replaceBooks: (books) => {
            STATE.books = books;
        },
        save: async () => await saveFixture(STATE),
    };
    return { state: STATE, store: STORE };
}

test("progress and its source receipt are saved in the same durable snapshot", async () => {
    const { state: STATE, store: STORE } = fixture();
    const RESULT = await applySyncImport(STORE, CHOICES);
    assert.equal(RESULT.imported, 1);
    assert.equal(STATE.changed, 1);
    assert.equal(STATE.durable[0].progress_percent, SOURCE.percentRead);
    assert.deepEqual(STATE.durable[0].sync_links, [SOURCE]);
});

test("failed persistence restores original progress and leaves the source importable", async () => {
    const { state: STATE, store: STORE } = fixture();
    STATE.saveOk = false;
    await assert.rejects(applySyncImport(STORE, CHOICES), /restored/);
    assert.equal(STATE.books[0].progress_percent, 0);
    assert.equal(STATE.books[0].sync_links, undefined);
    assert.equal(STATE.books[0].progress_updated_at, undefined);
    STATE.saveOk = true;
    assert.equal((await applySyncImport(STORE, CHOICES)).imported, 1);
});

test("a failed pre-import flush leaves all library state untouched", async () => {
    const { state: STATE, store: STORE } = fixture();
    const BEFORE = STATE.books;
    STATE.flushOk = false;
    await assert.rejects(applySyncImport(STORE, CHOICES), /current progress/);
    assert.equal(STATE.books, BEFORE);
    assert.equal(STATE.changed, 0);
});

test("rollback preserves unrelated edits and newly added books", async () => {
    const { state: STATE, store: STORE } = fixture();
    STORE.save = async () => {
        await Promise.resolve();
        STATE.books = [
            { ...STATE.books[0], title: "Renamed during save" },
            normalizeBook({ book_id: "new", title: "New book" }),
        ];
        return false;
    };
    await assert.rejects(applySyncImport(STORE, CHOICES), /restored/);
    assert.equal(STATE.books[0].progress_percent, 0);
    assert.equal(STATE.books[0].title, "Renamed during save");
    assert.equal(STATE.books[1].book_id, "new");
});

test("rollback does not overwrite newer reading progress entered during a failed save", async () => {
    const { state: STATE, store: STORE } = fixture();
    STORE.save = async () => {
        await Promise.resolve();
        STATE.books = [
            {
                ...STATE.books[0],
                progress_percent: 80,
                progress_updated_at: "2026-02-02T12:00:00Z",
            },
        ];
        throw new Error("disk full");
    };
    await assert.rejects(applySyncImport(STORE, CHOICES), /restored/);
    assert.equal(STATE.books[0].progress_percent, 80);
});
