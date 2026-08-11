// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

import { replanPolicy } from "../dist/renderer/app/plan-replan-policy.js";

const TODAY = "2026-08-11";
const TOMORROW = "2026-08-12";

function row(overrides = {}) {
    return {
        book_id: "book-1",
        date: TODAY,
        minutes: 56,
        session_index: 1,
        title: "Almost Finished",
        words_planned: 5600,
        ...overrides,
    };
}

test("automatic replanning starts tomorrow when today already has a plan", () => {
    const POLICY = replanPolicy({
        completions: {},
        explicitToday: false,
        previousRows: [row()],
        todayKey: TODAY,
    });

    assert.equal(POLICY.minimumStartDate, TOMORROW);
    assert.equal(POLICY.preservationMode, "through_today");
});

test("Replan Today reserves completed capacity and rebuilds unfinished work", () => {
    const COMPLETED = row();
    const INCOMPLETE = row({
        book_id: "book-2",
        minutes: 24,
        session_index: 2,
    });
    const POLICY = replanPolicy({
        completions: {
            [`${TODAY}|1|book-1`]: true,
        },
        explicitToday: true,
        previousRows: [COMPLETED, INCOMPLETE],
        todayKey: TODAY,
    });

    assert.equal(POLICY.minimumStartDate, TODAY);
    assert.equal(POLICY.preservationMode, "completed_today");
    assert.deepEqual(POLICY.settingsOverrides, {
        reserved_book_ids_by_date: { [TODAY]: ["book-1"] },
        reserved_minutes_by_date: { [TODAY]: 56 },
        reserved_sessions_by_date: { [TODAY]: 1 },
    });
});
