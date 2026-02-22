import { runPlanGeneration } from "../dist/renderer/app/plan.js";

const BOOKS = [{ book_id: "book-1", title: "Book 1" }];

const NOOP = () => {};

const NOOP_ASYNC = async () => {};

const DEFAULT_RESULT = { schedule: [], summary: null };

export function recordingGenerate(calls, result = DEFAULT_RESULT) {
  return async (payload) => {
    calls.push(payload);
    return result;
  };
}

export async function runPlanGenerationForTest({
  generate,
  collectSettings,
  setStatus = NOOP,
  addLog = NOOP,
}) {
  await runPlanGeneration({
    plannerApi: { generate },
    collectBooks: () => BOOKS,
    collectSettings,
    setStatus,
    addLog,
    announce: NOOP,
    onSuccess: NOOP_ASYNC,
    successAnnouncement: "",
  });
}
