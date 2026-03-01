import { runPlanGeneration } from "../dist/renderer/app/plan.js";

const BOOKS = [{ book_id: "book-1", title: "Book 1" }];

const NOOP = () => undefined;

const NOOP_ASYNC = () => Promise.resolve();

const DEFAULT_RESULT = { schedule: [], summary: null };

/**
 * Builds generate stub that records payloads and returns fixed result.
 * @param {Array<unknown>} calls Call payload accumulator.
 * @param {{schedule: Array<unknown>, summary: unknown}} result Generate result.
 * @returns {(payload: unknown) => Promise<unknown>} Recording generate stub.
 */
export function recordingGenerate(calls, result = DEFAULT_RESULT) {
    return (payload) => {
        calls.push(payload);
        return Promise.resolve(result);
    };
}

/**
 * Runs plan generation with deterministic test wiring.
 * @param {object} root0 Dependency overrides.
 * @param {(payload: unknown) => Promise<unknown>} root0.generate Planner generate fn.
 * @param {() => Record<string, unknown>} root0.collectSettings Settings collector.
 * @param {(status: string) => void} root0.setStatus Status sink.
 * @param {(message: string) => void} root0.addLog Log sink.
 * @returns {Promise<void>} Promise that resolves when generation completes.
 */
export async function runPlanGenerationForTest({
    generate,
    collectSettings,
    setStatus = NOOP,
    addLog = NOOP,
}) {
    await runPlanGeneration({
        addLog,
        announce: NOOP,
        collectBooks: () => BOOKS,
        collectSettings,
        onSuccess: NOOP_ASYNC,
        plannerApi: { generate },
        setStatus,
        successAnnouncement: "",
    });
}
