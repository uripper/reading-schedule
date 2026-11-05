/** Covers deadline cleanup, retries, and late results without real waiting. */
import assert from "node:assert/strict";
import test from "node:test";
import { COVER_JOB_TIMEOUT_MS } from "../dist/renderer/books/cover-deadline.js";
import { BookCoverJobs } from "../dist/renderer/books/cover-jobs.js";
import {
    releaseCoverUpload,
    stageCoverUpload,
} from "../dist/renderer/books/cover-upload-staging.js";
import { normalizeBook } from "../dist/renderer/books/model-normalize.js";

function deadlineScenario(context, source = {}) {
    const PREVIOUS = globalThis.plannerApi;
    const OLD = Promise.withResolvers();
    const NEW = Promise.withResolvers();
    const STATE = {
        attempts: 0,
        books: [
            normalizeBook({
                book_id: "deadline",
                cover_url: "https://example.com/cover.jpg",
                ...source,
            }),
        ],
    };
    globalThis.plannerApi = downloadRuntime(STATE, OLD, NEW);
    context.after(() => {
        globalThis.plannerApi = PREVIOUS;
    });
    context.mock.timers.enable({ apis: ["setTimeout"] });
    const JOBS = uploadJobs(STATE);
    return { jobs: JOBS, newer: NEW, old: OLD, state: STATE };
}

test("a stalled download releases its job and the same cover can be retried", async (context) => {
    const RUN = deadlineScenario(context);
    const FIRST = RUN.jobs.queue(RUN.state.books[0]);
    await RUN.jobs.queue(RUN.state.books[0]);
    assert.equal(RUN.state.attempts, 1);
    context.mock.timers.tick(COVER_JOB_TIMEOUT_MS);
    await FIRST;
    const RETRY = RUN.jobs.queue(RUN.state.books[0]);
    assert.equal(RUN.state.attempts, 2);
    RUN.newer.resolve("/covers/retry.jpg");
    await RETRY;
    RUN.old.resolve("/covers/expired.jpg");
    await Promise.resolve();
    assert.equal(RUN.state.books[0].cover_local_path, "/covers/retry.jpg");
});

test("a late timed-out result cannot finish or clear a newer pending job", async (context) => {
    const RUN = deadlineScenario(context);
    const FIRST = RUN.jobs.queue(RUN.state.books[0]);
    context.mock.timers.tick(COVER_JOB_TIMEOUT_MS);
    await FIRST;
    const RETRY = RUN.jobs.queue(RUN.state.books[0]);
    RUN.old.resolve("/covers/expired.jpg");
    await Promise.resolve();
    await RUN.jobs.queue(RUN.state.books[0]);
    assert.equal(RUN.state.attempts, 2);
    assert.equal(RUN.state.books[0].cover_local_path, "");
    RUN.newer.resolve("/covers/current.jpg");
    await RETRY;
    assert.equal(RUN.state.books[0].cover_local_path, "/covers/current.jpg");
});

function uploadDeadlineRuntime(context) {
    const PREVIOUS = {
        api: globalThis.plannerApi,
        reader: globalThis.FileReader,
    };
    const STATE = { pending: Promise.withResolvers(), reads: [] };
    globalThis.FileReader = function uploadReader() {
        return {
            readAsDataURL() {
                STATE.reads.push(this);
            },
        };
    };
    globalThis.plannerApi = { saveUploadedCover: () => STATE.pending.promise };
    context.after(() => {
        globalThis.plannerApi = PREVIOUS.api;
        globalThis.FileReader = PREVIOUS.reader;
    });
    return STATE;
}

test("stalled upload transport and native processing both release the job for a reselected file", async (context) => {
    context.mock.timers.enable({ apis: ["setTimeout"] });
    const RUNTIME = uploadDeadlineRuntime(context);
    const FILE = new File(["image"], "cover.png", { type: "image/png" });
    const STATE = { books: [normalizeBook({ book_id: "upload" })] };
    const JOBS = uploadJobs(STATE);
    await expireUpload(context, {
        file: FILE,
        jobs: JOBS,
        runtime: RUNTIME,
        state: STATE,
    });
    RUNTIME.pending.resolve("/covers/recovered.jpg");
    const SOURCE = stageCoverUpload(FILE);
    const WORK = JOBS.queue({ ...STATE.books[0], cover_local_path: SOURCE });
    completeFileRead(RUNTIME.reads.at(-1));
    releaseCoverUpload(SOURCE);
    await WORK;
    assert.equal(STATE.books[0].cover_local_path, "/covers/recovered.jpg");
});

async function expireUpload(context, run) {
    const SOURCE = stageCoverUpload(run.file);
    const FIRST = run.jobs.queue({
        ...run.state.books[0],
        cover_local_path: SOURCE,
    });
    releaseCoverUpload(SOURCE);
    context.mock.timers.tick(COVER_JOB_TIMEOUT_MS);
    await FIRST;
    const SECOND_SOURCE = stageCoverUpload(run.file);
    const SECOND = run.jobs.queue({
        ...run.state.books[0],
        cover_local_path: SECOND_SOURCE,
    });
    completeFileRead(run.runtime.reads.at(-1));
    releaseCoverUpload(SECOND_SOURCE);
    await Promise.resolve();
    context.mock.timers.tick(COVER_JOB_TIMEOUT_MS);
    await SECOND;
    assert.equal(run.state.books[0].cover_local_path, "");
}

function completeFileRead(reader) {
    const READER = reader;
    READER.result = "data:image/png;base64,fixture";
    reader.onload();
}

function downloadRuntime(state, first, second) {
    const STATE = state;
    return {
        downloadCover: () => {
            STATE.attempts += 1;
            if (STATE.attempts === 1) {
                return first.promise;
            }
            return second.promise;
        },
    };
}

function uploadJobs(state) {
    const STATE = state;
    return new BookCoverJobs(
        () => STATE.books,
        (completed) => {
            STATE.books = [completed];
        },
    );
}
