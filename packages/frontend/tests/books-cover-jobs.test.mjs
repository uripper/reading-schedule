/** Exercises late cover results against live library changes and serialized snapshots. */
import assert from "node:assert/strict";
import test from "node:test";
import { nextBooksAfterDialogSave } from "../dist/renderer/books/controller-save.js";
import { BookCoverJobs } from "../dist/renderer/books/cover-jobs.js";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";

function deferred() {
    return Promise.withResolvers();
}

function book(overrides = {}) {
    return normalizeBook({
        book_id: "book-1",
        cover_url: "https://example.com/cover.jpg",
        pages_total: 200,
        title: "Cover test",
        ...overrides,
    });
}

function harness() {
    const STATE = { books: [book()], saved: [] };
    const JOBS = new BookCoverJobs(
        () => STATE.books,
        (completed) => {
            STATE.books = STATE.books.map((current) => {
                if (current.book_id === completed.book_id) {
                    return completed;
                }
                return current;
            });
            STATE.saved.push(structuredClone(STATE.books));
        },
    );
    return { jobs: JOBS, state: STATE };
}

async function withDownload(downloadCover, action) {
    const PREVIOUS = globalThis.plannerApi;
    globalThis.plannerApi = { downloadCover };
    try {
        await action();
    } finally {
        globalThis.plannerApi = PREVIOUS;
    }
}

test("slow completion patches only its book and preserves later progress and additions", async () => {
    const PENDING = deferred();
    await withDownload(
        () => PENDING.promise,
        async () => {
            const { jobs, state } = harness();
            const WORK = jobs.queue(state.books[0]);
            state.books[0] = editedPendingBook(state.books[0]);
            state.books = nextBooksAfterDialogSave(state.books, {
                book: book({ book_id: "second", cover_url: "" }),
            });
            assert.equal(state.books.length, 2);
            assert.equal(state.saved.length, 0);
            PENDING.resolve("/covers/completed.jpg");
            await WORK;
            assertCompletedBook(state);
        },
    );
});

test("deletion invalidates a result even if the same book id is restored", async () => {
    const PENDING = deferred();
    await withDownload(
        () => PENDING.promise,
        async () => {
            const { jobs, state } = harness();
            const WORK = jobs.queue(state.books[0]);
            state.books = [];
            jobs.retain(state.books);
            state.books = [book()];
            PENDING.resolve("/covers/deleted.jpg");
            await WORK;
            assert.equal(state.saved.length, 0);
        },
    );
});

test("a newer cover wins when an earlier download completes last", async () => {
    const OLD = deferred();
    const NEW = deferred();
    await withDownload(
        (url) => {
            if (url.endsWith("new.jpg")) {
                return NEW.promise;
            }
            return OLD.promise;
        },
        async () => {
            const { jobs, state } = harness();
            const OLD_WORK = jobs.queue(state.books[0]);
            state.books = [book({ cover_url: "https://example.com/new.jpg" })];
            jobs.retain(state.books);
            const NEW_WORK = jobs.queue(state.books[0]);
            NEW.resolve("/covers/new.jpg");
            await NEW_WORK;
            OLD.resolve("/covers/old.jpg");
            await OLD_WORK;
            assert.equal(state.saved.length, 1);
            assert.equal(state.books[0].cover_local_path, "/covers/new.jpg");
        },
    );
});

test("failed cover processing leaves the book saved and a later attempt succeeds", async () => {
    let attempts = 0;
    await withDownload(
        () => {
            attempts += 1;
            if (attempts === 1) {
                return Promise.reject(new Error("decode failed"));
            }
            return Promise.resolve("/covers/retried.jpg");
        },
        async () => {
            const { jobs, state } = harness();
            await jobs.queue(state.books[0]);
            assert.equal(state.books.length, 1);
            assert.equal(state.books[0].cover_local_path, "");
            await jobs.queue(state.books[0]);
            assert.equal(
                state.books[0].cover_local_path,
                "/covers/retried.jpg",
            );
        },
    );
});

test("state replacement invalidates pending results", async () => {
    const PENDING = deferred();
    await withDownload(
        () => PENDING.promise,
        async () => {
            const { jobs, state } = harness();
            const WORK = jobs.queue(state.books[0]);
            jobs.reset();
            PENDING.resolve("/covers/previous-state.jpg");
            await WORK;
            assert.equal(state.saved.length, 0);
        },
    );
});

function editedPendingBook(book) {
    return { ...book, pages_read: 20, title: "Edited" };
}

function assertCompletedBook(state) {
    assert.equal(state.saved.length, 1);
    assert.equal(state.saved[0][0].title, "Edited");
    assert.equal(state.saved[0][0].pages_read, 20);
    assert.equal(state.saved[0][0].cover_local_path, "/covers/completed.jpg");
    assert.equal(state.saved[0][1].cover_local_path, "");
}
