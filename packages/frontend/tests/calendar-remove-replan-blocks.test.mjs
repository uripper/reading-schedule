// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
/**
 * Verifies removals delete current entries without preventing later replanning.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { removeSessionRow } from "../dist/renderer/app/calendar_interactions/calendar_interactions_schedule_updates.js";
import { nextDayKey, todayDayKey } from "../dist/renderer/app/date_keys.js";
import { mergeScheduleRows } from "../dist/renderer/app/schedule_preserve.js";

const TODAY = todayDayKey();
const TOMORROW = nextDayKey(TODAY);

/**
 * Builds schedule row fixture with override support.
 * @param {Record<string, unknown>} overrides - Row field overrides.
 * @returns {Record<string, unknown>} Row fixture.
 */
function row(overrides = {}) {
    return {
        book_id: "book-1",
        date: TODAY,
        minutes: 15,
        session_index: 1,
        title: "Book 1",
        words_planned: 1500,
        ...overrides,
    };
}

function createScenarioRows() {
    return {
        keepRow: row({
            book_id: "book-2",
            date: TOMORROW,
            session_index: 1,
            title: "Book 2",
        }),
        removedRow: row(),
    };
}

function createRemovalState(removedRow, keepRow) {
    return {
        blockedDayBooks: {},
        lastResult: {
            created_at: "2026-02-23T00:00:00.000Z",
            schedule: [removedRow, keepRow],
            summary: null,
        },
        scheduleCompletions: {},
    };
}

function applyBlockedMutation(state, mutation) {
    const MUTABLE_STATE = state;
    if (mutation.blocked) {
        MUTABLE_STATE.blockedDayBooks[mutation.key] = true;
        return;
    }
    delete MUTABLE_STATE.blockedDayBooks[mutation.key];
}

function applyStateMutation(state, mutation) {
    const MUTABLE_STATE = state;
    if (mutation.type === "set_schedule_completions") {
        MUTABLE_STATE.scheduleCompletions = mutation.scheduleCompletions;
        return;
    }
    if (mutation.type === "set_blocked_day_book") {
        applyBlockedMutation(MUTABLE_STATE, mutation);
    }
}

function incrementCounter(counter) {
    const MUTABLE_COUNTER = counter;
    MUTABLE_COUNTER.count += 1;
}

function removeRowFromState(state, removedRow, counter) {
    const MUTABLE_STATE = state;
    return removeSessionRow({
        applyStateMutation(mutation) {
            applyStateMutation(MUTABLE_STATE, mutation);
        },
        onScheduleRowsUpdated() {
            incrementCounter(counter);
        },
        queuePersist() {
            incrementCounter(counter);
        },
        renderCalendar() {
            incrementCounter(counter);
        },
        row: removedRow,
        setBookScheduleRows() {
            incrementCounter(counter);
        },
        setLastResult(result) {
            MUTABLE_STATE.lastResult = result;
        },
        setStatus() {
            incrementCounter(counter);
        },
        state: MUTABLE_STATE,
        totalsFromSummary() {
            return {};
        },
    });
}

function mergeReplannedRows(state, rows) {
    return mergeScheduleRows({
        blockedDayBooks: state.blockedDayBooks,
        nextRows: rows,
        preservationMode: "completed_today",
        previousRows: [],
        sessions: [],
    });
}

test("removed sessions can be scheduled again by Replan Today", () => {
    const SCENARIO = createScenarioRows();
    const STATE = createRemovalState(SCENARIO.removedRow, SCENARIO.keepRow);
    const COUNTER = { count: 0 };
    const REMOVED = removeRowFromState(STATE, SCENARIO.removedRow, COUNTER);

    assert.equal(REMOVED, true);
    assert.deepEqual(STATE.blockedDayBooks, {});
    assert.deepEqual(STATE.lastResult.schedule, [SCENARIO.keepRow]);
    assert.ok(COUNTER.count > 0);

    const MERGED = mergeReplannedRows(STATE, [
        SCENARIO.removedRow,
        SCENARIO.keepRow,
    ]);

    assert.equal(
        MERGED.some(
            (entry) => entry.date === TODAY && entry.book_id === "book-1",
        ),
        true,
    );
});

test("legacy saved removal blocks do not discard a regenerated session", () => {
    const SCENARIO = createScenarioRows();
    const STATE = createRemovalState(SCENARIO.removedRow, SCENARIO.keepRow);
    STATE.blockedDayBooks[`${TODAY}|book-1`] = true;
    const MERGED = mergeReplannedRows(STATE, [SCENARIO.removedRow]);
    assert.deepEqual(MERGED, [SCENARIO.removedRow]);
});
