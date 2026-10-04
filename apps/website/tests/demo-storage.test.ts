/** Regression coverage for local sample dates, persistence, and reset races. */

import assert from "node:assert/strict";
import test from "node:test";
import type { PlannerStateSnapshot } from "@reading-schedule/contracts";
import { createDemoSample } from "../src/demo/sample.ts";
import { DEMO_STORAGE_KEY, DemoStorage } from "../src/demo/storage.ts";

/** Provides an isolated browser-storage boundary for persistence tests. */
function memoryStorage() {
    const ITEMS = new Map<string, string>();
    return {
        getItem: (key: string) => ITEMS.get(key) ?? null,
        removeItem: (key: string) => ITEMS.delete(key),
        setItem: (key: string, value: string) => ITEMS.set(key, value),
    };
}

/** Supplies a complete persisted snapshot with the same sample as startup. */
function snapshot(): PlannerStateSnapshot {
    return {
        ...createDemoSample(new Date(2030, 0, 2)),
        blocked_day_books: {},
        feature_flags: { gamificationEnabled: true, socialEnabled: false },
        last_result: null,
        preferences: {
            dailyGoalMinutes: 30,
            reduceMotion: false,
            reminderEnabled: false,
            reminderTime: "20:00",
            timezone: "America/Denver",
        },
        schedule_completions: {},
        sessions: [],
        state_version: 1,
    };
}

test("demo uses local dates, including leap day, and removes stale deadlines", () => {
    const SAMPLE = createDemoSample(new Date(2032, 1, 29, 23));
    assert.equal(SAMPLE.settings.start_date, "2032-02-29");
    assert.equal(SAMPLE.settings.end_date, "2042-03-01");
    assert.ok(SAMPLE.books.length > 0);
    assert.ok(SAMPLE.books.every((book) => book.deadline === null));
    assert.deepEqual(SAMPLE.settings.minutes_by_weekday, {});
});

test("saved books and reading budgets survive a new demo storage instance", () => {
    const MEMORY = memoryStorage();
    const STATE = snapshot();
    STATE.settings.minutes_per_day = 45;
    assert.deepEqual(new DemoStorage(() => MEMORY).save(STATE), { ok: true });
    const LOADED = new DemoStorage(() => MEMORY).load();
    assert.equal(LOADED.source, "browser_storage");
    assert.deepEqual(LOADED.state, STATE);
});

test("sample page counts and covers reach the shared frontend book fields", () => {
    const SAMPLE = createDemoSample();
    const ULYSSES = SAMPLE.books.find((book) => book.book_id === "sample-001");
    assert.equal(ULYSSES?.pages_total, 730);
    assert.ok(SAMPLE.books.every((book) => Number.isInteger(book.pages_total)));
    assert.ok(
        SAMPLE.books.every((book) =>
            book.cover_url.startsWith(
                "https://images.penguinrandomhouse.com/cover/",
            ),
        ),
    );
    const PRIDE = SAMPLE.books.find((book) => book.book_id === "sample-002");
    assert.equal(
        PRIDE?.cover_url,
        "https://images.penguinrandomhouse.com/cover/9780141439518?width=900&height=1400",
    );
});

test("reset preserves unrelated keys and blocks delayed saves", () => {
    const MEMORY = memoryStorage();
    const STORE = new DemoStorage(() => MEMORY);
    MEMORY.setItem("unrelated", "keep me");
    STORE.save(snapshot());
    STORE.reset();
    STORE.save(snapshot());
    assert.equal(MEMORY.getItem(DEMO_STORAGE_KEY), null);
    assert.equal(MEMORY.getItem("unrelated"), "keep me");
    assert.equal(new DemoStorage(() => MEMORY).load().state, null);
});

test("malformed saved data recovers with a visible warning", () => {
    const MEMORY = memoryStorage();
    MEMORY.setItem(DEMO_STORAGE_KEY, '{"books":[]}');
    const LOADED = new DemoStorage(() => MEMORY).load();
    assert.equal(LOADED.state, null);
    assert.equal(LOADED.warningCode, "STATE_RESET_FRESH");
    assert.match(LOADED.warningMessage ?? "", /reset the demo/);
});

test("denied browser storage reports failed saves without breaking sample startup", () => {
    const STORE = new DemoStorage(() => {
        throw new Error("Storage access denied");
    });
    assert.equal(STORE.load().source, "fresh");
    assert.equal(STORE.save(snapshot()).ok, false);
    assert.throws(() => STORE.reset(), /Storage access denied/);
});

test("quota failures remain actionable and preserve the previous snapshot", () => {
    const MEMORY = memoryStorage();
    const STATE = snapshot();
    new DemoStorage(() => MEMORY).save(STATE);
    const STORE = new DemoStorage(() => ({
        ...MEMORY,
        setItem: () => {
            throw new Error("Quota exceeded");
        },
    }));
    assert.match(STORE.save(STATE).error ?? "", /Quota exceeded/);
    assert.deepEqual(STORE.load().state, STATE);
});
