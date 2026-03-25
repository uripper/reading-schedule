// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    isValidDateKey,
    navigateToEstimatedFinishDate,
} from "../dist/renderer/books/estimated_finish_navigation.js";

test("isValidDateKey accepts valid day keys", () => {
    assert.equal(isValidDateKey("2026-02-22"), true);
});

test("isValidDateKey rejects impossible day keys", () => {
    assert.equal(isValidDateKey("2026-02-30"), false);
});

test("navigateToEstimatedFinishDate triggers callback only for valid keys", () => {
    let navigatedDate = "";
    const FIRST = navigateToEstimatedFinishDate("2026-03-10", (dateKey) => {
        navigatedDate = dateKey;
    });
    const SECOND = navigateToEstimatedFinishDate("bad-date", () => {
        navigatedDate = "bad";
    });

    assert.equal(FIRST, true);
    assert.equal(SECOND, false);
    assert.equal(navigatedDate, "2026-03-10");
});
