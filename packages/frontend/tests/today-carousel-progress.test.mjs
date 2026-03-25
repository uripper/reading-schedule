// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built Electron artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import {
    boundedTodayProgressDraft,
    buildTodayProgressInputViewModel,
    formatPagesTotalText,
} from "../dist/renderer/app/today/today_carousel_progress.js";

test("formatPagesTotalText renders known total", () => {
    assert.equal(formatPagesTotalText(328), "328");
});

test("formatPagesTotalText renders unknown total placeholder", () => {
    assert.equal(formatPagesTotalText(null), "--");
});

test("buildTodayProgressInputViewModel uses placeholders for saved progress", () => {
    const VIEW_MODEL = buildTodayProgressInputViewModel({
        currentPagesRead: 120,
        currentPercent: 36.6,
        draft: null,
        pagesTotal: 328,
    });

    assert.equal(VIEW_MODEL.pagesText, "");
    assert.equal(VIEW_MODEL.pagesPlaceholder, "120");
    assert.equal(VIEW_MODEL.percentText, "");
    assert.equal(VIEW_MODEL.percentPlaceholder, "36.6");
    assert.equal(VIEW_MODEL.pagesMax, "328");
});

test("buildTodayProgressInputViewModel derives percent hint from typed pages", () => {
    const VIEW_MODEL = buildTodayProgressInputViewModel({
        currentPagesRead: 120,
        currentPercent: 36.6,
        draft: {
            pagesText: "164",
            percentText: "",
        },
        pagesTotal: 328,
    });

    assert.equal(VIEW_MODEL.pagesText, "164");
    assert.equal(VIEW_MODEL.percentPlaceholder, "50");
});

test("buildTodayProgressInputViewModel derives pages hint from typed percent", () => {
    const VIEW_MODEL = buildTodayProgressInputViewModel({
        currentPagesRead: 120,
        currentPercent: 36.6,
        draft: {
            pagesText: "",
            percentText: "25",
        },
        pagesTotal: 328,
    });

    assert.equal(VIEW_MODEL.percentText, "25");
    assert.equal(VIEW_MODEL.pagesPlaceholder, "82");
});

test("boundedTodayProgressDraft clamps oversized values to valid maxima", () => {
    const DRAFT = boundedTodayProgressDraft({
        draft: {
            pagesText: "99999999",
            percentText: "999999",
        },
        pagesTotal: 336,
    });

    assert.equal(DRAFT.pagesText, "336");
    assert.equal(DRAFT.percentText, "100");
});

test("boundedTodayProgressDraft clamps negative values to zero", () => {
    const DRAFT = boundedTodayProgressDraft({
        draft: {
            pagesText: "-5",
            percentText: "-10",
        },
        pagesTotal: 336,
    });

    assert.equal(DRAFT.pagesText, "0");
    assert.equal(DRAFT.percentText, "0");
});
