// biome-ignore-all lint/correctness/noUnresolvedImports: this test intentionally imports built shared frontend artifacts from dist.
import assert from "node:assert/strict";
import test from "node:test";

const { runPlanGeneration } = await import("../dist/renderer/app/plan.js");

const BOOKS = [{ book_id: "book-1", title: "Book 1" }];
const SETTINGS = {
    end_date: "2026-06-01",
    start_date: "2026-05-21",
    wpm_base: 250,
};
const GENERATED_SCHEDULE = [
    {
        book_id: "book-1",
        date: "2026-05-21",
        minutes: 30,
        session_index: 1,
        title: "Book 1",
        words_planned: 7500,
    },
    {
        book_id: "book-2",
        date: "2026-05-22",
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
