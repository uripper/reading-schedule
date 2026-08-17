// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { BOOK_STATUS_READ } from "../dist/renderer/books/status_catalog.js";
import { buildStatsSnapshot } from "../dist/renderer/stats/model.js";

const JULY_MONTH_INDEX = 6;
const AUGUST_MONTH_INDEX = 7;

function readBookWithStalePlannedFinishSnapshot() {
    const YEAR = new Date().getFullYear();
    return buildStatsSnapshot({
        books: [
            {
                book_id: "book-1",
                finished_at: `${YEAR}-08-01`,
                progress_percent: 100,
                status: BOOK_STATUS_READ,
            },
        ],
        lastResult: {
            schedule: [{ book_id: "book-1", date: `${YEAR}-07-31` }],
            summary: { per_book: { "book-1": { finished: true } } },
        },
        scheduleCompletions: {},
        sessions: [],
    });
}

test("a recorded finish replaces the same book's planned finish", () => {
    const SNAPSHOT = readBookWithStalePlannedFinishSnapshot();

    assert.equal(SNAPSHOT.finishedThisYearCount, 1);
    assert.equal(SNAPSHOT.plannedFinishCount, 0);
    assert.equal(SNAPSHOT.projectedFinishCount, 1);
    assert.equal(SNAPSHOT.monthlyFinishes[JULY_MONTH_INDEX], 0);
    assert.equal(SNAPSHOT.monthlyFinishes[AUGUST_MONTH_INDEX], 1);
});
