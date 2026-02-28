import assert from "node:assert/strict";
import test from "node:test";

import { tomorrowKey } from "./plan-start-date-date-helpers.mjs";
import {
	recordingGenerate,
	runPlanGenerationForTest,
} from "./plan-start-date-runner.mjs";

test("runPlanGeneration forces settings.start_date to tomorrow", async () => {
	const calls = [];
	await runPlanGenerationForTest({
		generate: recordingGenerate(calls),
		collectSettings: () => ({
			start_date: "1999-01-01",
			end_date: "2099-01-01",
			minutes_per_day: 20,
		}),
	});

	assert.equal(calls.length, 1);
	assert.equal(calls[0].settings.start_date, tomorrowKey());
	assert.equal(calls[0].settings.end_date, "2099-01-01");
	assert.equal(calls[0].settings.minutes_per_day, 20);
});

test("runPlanGeneration clamps end_date to tomorrow when it is in the past", async () => {
	const calls = [];
	await runPlanGenerationForTest({
		generate: recordingGenerate(calls),
		collectSettings: () => ({
			end_date: "1999-01-01",
		}),
	});

	assert.equal(calls.length, 1);
	assert.equal(calls[0].settings.start_date, tomorrowKey());
	assert.equal(calls[0].settings.end_date, tomorrowKey());
});

test("runPlanGeneration logs plan error details when generation fails", async () => {
	const logs = [];
	const statuses = [];
	await runPlanGenerationForTest({
		generate: () => {
			throw new Error("end_date must be on or after start_date");
		},
		collectSettings: () => ({ end_date: "1999-01-01" }),
		setStatus: (message, isError) => {
			statuses.push({ message, isError });
		},
		addLog: (message) => {
			logs.push(message);
		},
	});

	assert.equal(statuses.at(-1)?.message, "Failed to generate plan");
	assert.equal(statuses.at(-1)?.isError, true);
	assert.equal(
		logs.at(-1),
		"Plan generation error: end_date must be on or after start_date",
	);
});

test("runPlanGeneration logs fallback error detail for unknown failures", async () => {
	const logs = [];
	await runPlanGenerationForTest({
		generate: () => {
			throw {};
		},
		collectSettings: () => ({ minutes_per_day: 20 }),
		addLog: (message) => {
			logs.push(message);
		},
	});

	assert.equal(logs.at(-1), "Plan generation error: Unknown planner error");
});
