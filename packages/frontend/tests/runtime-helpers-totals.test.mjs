// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { totalsFromSummary } from "../dist/renderer/app/runtime_helpers.js";

test("totalsFromSummary prefers remaining words from planner summary", () => {
    const TOTALS = totalsFromSummary({
        per_book: {
            "book-1": {
                remaining_words: 321,
                words_total: 999,
            },
        },
    });

    assert.equal(TOTALS["book-1"], 321);
});

test("totalsFromSummary falls back to words_total for legacy payloads", () => {
    const TOTALS = totalsFromSummary({
        per_book: {
            "book-1": {
                words_total: 456,
            },
        },
    });

    assert.equal(TOTALS["book-1"], 456);
});
