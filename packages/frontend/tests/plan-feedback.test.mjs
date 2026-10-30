// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

const { runPlanGeneration } = await import("../dist/renderer/app/plan.js");
const { applyPlannedData } = await import(
    "../dist/renderer/app/plan_controller_apply.js"
);

const { todayDayKey, nextDayKey } = await import(
    "../dist/renderer/app/date_keys.js"
);
const TODAY = todayDayKey();

const BOOKS = [{ book_id: "book-1", title: "Book 1" }];
const SETTINGS = {
    end_date: "2026-06-01",
    start_date: TODAY,
    wpm_base: 250,
};
const GENERATED_SCHEDULE = [
    {
        book_id: "book-1",
        date: TODAY,
        minutes: 30,
        session_index: 1,
        title: "Book 1",
        words_planned: 7500,
    },
    {
        book_id: "book-2",
        date: nextDayKey(TODAY),
        minutes: 15,
        session_index: 1,
        title: "Book 2",
        words_planned: 3750,
    },
];
const GENERATED_SUMMARY = {
    status: "FEASIBLE",
    total_available_minutes: 99999,
    total_planned_minutes: 45,
};

function generatedPlan() {
    return Promise.resolve({
        schedule: GENERATED_SCHEDULE,
        summary: GENERATED_SUMMARY,
    });
}

function plannerApi() {
    return {
        generate: generatedPlan,
    };
}

function planArgs(overrides = {}) {
    return {
        addLog: () => undefined,
        announce: () => undefined,
        collectBooks: () => BOOKS,
        collectSettings: () => SETTINGS,
        onSuccess: () => Promise.resolve(),
        plannerApi: plannerApi(),
        setStatus: () => undefined,
        successAnnouncement: "",
        ...overrides,
    };
}

test("plan summary log omits horizon capacity", async () => {
    const Logs = [];
    await runPlanGeneration(
        planArgs({
            addLog: (message) => {
                Logs.push(message);
            },
        }),
    );

    assert.equal(
        Logs.includes(
            "Status FEASIBLE. Planned 45 minutes, 2 books, across 2 days.",
        ),
        true,
    );
    assert.equal(
        Logs.some((message) => message.includes("45/99999")),
        false,
    );
});

test("a failed schedule save suppresses success status and announcements", async () => {
    const STATUSES = [];
    const ANNOUNCEMENTS = [];
    await runPlanGeneration(
        planArgs({
            announce: (message) => ANNOUNCEMENTS.push(message),
            onSuccess: async () => false,
            setStatus: (...args) => STATUSES.push(args),
            successAnnouncement: "Plan generated and schedule updated.",
        }),
    );
    assert.equal(
        STATUSES.some((args) => args[2] === "success"),
        false,
    );
    assert.deepEqual(ANNOUNCEMENTS, []);
});

test("an empty library also suppresses success when its updated state is unsaved", async () => {
    const STATUSES = [];
    await runPlanGeneration(
        planArgs({
            collectBooks: () => [],
            onSuccess: async () => false,
            setStatus: (...args) => STATUSES.push(args),
        }),
    );
    assert.deepEqual(STATUSES, []);
});

test("applying a generated plan keeps it in memory while reporting a failed save", async () => {
    let result;
    const SAVED = await applyPlannedData({
        data: { schedule: GENERATED_SCHEDULE, summary: GENERATED_SUMMARY },
        getBlockedDayBooks: () => ({}),
        getLastResult: () => null,
        getScheduleCompletions: () => ({}),
        persistDraft: () => Promise.resolve(false),
        preservationMode: "completed_today",
        renderCalendar: () => undefined,
        setBookScheduleRows: () => undefined,
        setLastResult: (next) => {
            result = next;
        },
        setScheduleCompletions: () => undefined,
        totalsFromSummary: () => ({}),
        updateTodayView: () => undefined,
    });
    assert.equal(SAVED, false);
    assert.deepEqual(result.schedule, GENERATED_SCHEDULE);
});
