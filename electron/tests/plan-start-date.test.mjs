import test from "node:test";
import assert from "node:assert/strict";

import { runPlanGeneration } from "../dist/renderer/app/plan.js";

function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function tomorrowKey() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dayKey(tomorrow);
}

test("runPlanGeneration forces settings.start_date to tomorrow", async () => {
  const calls = [];

  await runPlanGeneration({
    plannerApi: {
      generate: async (payload) => {
        calls.push(payload);
        return { schedule: [], summary: null };
      },
    },
    collectBooks: () => [{ book_id: "book-1", title: "Book 1" }],
    collectSettings: () => ({
      start_date: "1999-01-01",
      end_date: "2099-01-01",
      minutes_per_day: 20,
    }),
    setStatus: () => {},
    addLog: () => {},
    announce: () => {},
    onSuccess: async () => {},
    successAnnouncement: "",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].settings.start_date, tomorrowKey());
  assert.equal(calls[0].settings.end_date, "2099-01-01");
  assert.equal(calls[0].settings.minutes_per_day, 20);
});

test("runPlanGeneration clamps end_date to tomorrow when it is in the past", async () => {
  const calls = [];

  await runPlanGeneration({
    plannerApi: {
      generate: async (payload) => {
        calls.push(payload);
        return { schedule: [], summary: null };
      },
    },
    collectBooks: () => [{ book_id: "book-1", title: "Book 1" }],
    collectSettings: () => ({
      end_date: "1999-01-01",
    }),
    setStatus: () => {},
    addLog: () => {},
    announce: () => {},
    onSuccess: async () => {},
    successAnnouncement: "",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].settings.start_date, tomorrowKey());
  assert.equal(calls[0].settings.end_date, tomorrowKey());
});

test("runPlanGeneration logs plan error details when generation fails", async () => {
  const logs = [];
  const statuses = [];

  await runPlanGeneration({
    plannerApi: {
      generate: async () => {
        throw new Error("end_date must be on or after start_date");
      },
    },
    collectBooks: () => [{ book_id: "book-1", title: "Book 1" }],
    collectSettings: () => ({ end_date: "1999-01-01" }),
    setStatus: (message, isError) => {
      statuses.push({ message, isError });
    },
    addLog: (message) => {
      logs.push(message);
    },
    announce: () => {},
    onSuccess: async () => {},
    successAnnouncement: "",
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

  await runPlanGeneration({
    plannerApi: {
      generate: async () => {
        throw {};
      },
    },
    collectBooks: () => [{ book_id: "book-1", title: "Book 1" }],
    collectSettings: () => ({ minutes_per_day: 20 }),
    setStatus: () => {},
    addLog: (message) => {
      logs.push(message);
    },
    announce: () => {},
    onSuccess: async () => {},
    successAnnouncement: "",
  });

  assert.equal(logs.at(-1), "Plan generation error: Unknown planner error");
});
