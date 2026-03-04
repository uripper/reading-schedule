import assert from "node:assert/strict";
import test from "node:test";

import { tomorrowKey } from "./plan-start-date-date-helpers.mjs";
import {
    recordingGenerate,
    runPlanGenerationForTest,
} from "./plan-start-date-runner.mjs";

test("runPlanGeneration forces settings.start_date to tomorrow", async () => {
    const CALLS = [];
    await runPlanGenerationForTest({
        collectSettings: () => ({
            end_date: "2099-01-01",
            minutes_per_day: 20,
            start_date: "1999-01-01",
        }),
        generate: recordingGenerate(CALLS),
    });

    assert.equal(CALLS.length, 1);
    assert.equal(CALLS[0].planner, "mip");
    assert.equal(CALLS[0].settings.start_date, tomorrowKey());
    assert.equal(CALLS[0].settings.end_date, "2099-01-01");
    assert.equal(CALLS[0].settings.minutes_per_day, 20);
});

test("runPlanGeneration maps solver profile to planner token", async () => {
    const CALLS = [];
    await runPlanGenerationForTest({
        collectSettings: () => ({
            end_date: "2099-01-01",
            planner_solver_profile: "thorough",
        }),
        generate: recordingGenerate(CALLS),
    });

    assert.equal(CALLS.length, 1);
    assert.equal(CALLS[0].planner, "mip-thorough");
});

test("runPlanGeneration clamps end_date to tomorrow when it is in the past", async () => {
    const CALLS = [];
    await runPlanGenerationForTest({
        collectSettings: () => ({
            end_date: "1999-01-01",
        }),
        generate: recordingGenerate(CALLS),
    });

    assert.equal(CALLS.length, 1);
    assert.equal(CALLS[0].settings.start_date, tomorrowKey());
    assert.equal(CALLS[0].settings.end_date, tomorrowKey());
});

test("runPlanGeneration logs plan error details when generation fails", async () => {
    const LOGS = [];
    const STATUSES = [];
    await runPlanGenerationForTest({
        addLog: (message) => {
            LOGS.push(message);
        },
        collectSettings: () => ({ end_date: "1999-01-01" }),
        generate: () => {
            throw new Error("end_date must be on or after start_date");
        },
        setStatus: (message, isError) => {
            STATUSES.push({ isError, message });
        },
    });

    assert.equal(STATUSES.at(-1)?.message, "Failed to generate plan");
    assert.equal(STATUSES.at(-1)?.isError, true);
    assert.equal(
        LOGS.at(-1),
        "Plan generation error: end_date must be on or after start_date",
    );
});

test("runPlanGeneration logs fallback error detail for unknown failures", async () => {
    const LOGS = [];
    await runPlanGenerationForTest({
        addLog: (message) => {
            LOGS.push(message);
        },
        collectSettings: () => ({ minutes_per_day: 20 }),
        generate: () => {
            throw {};
        },
    });

    assert.equal(LOGS.at(-1), "Plan generation error: Unknown planner error");
});
