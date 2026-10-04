/** Correlates planner worker requests and recovers from failed or hung workers. */

import type {
    PlanGeneratePayload,
    PlannerResult,
} from "@reading-schedule/contracts";
import { parseBrowserPlannerResponse } from "@reading-schedule/contracts";

const REQUEST_TIMEOUT_MS = 30_000;
const FIRST_REQUEST_ID = 1;
const REQUEST_ID_INCREMENT = 1;

// audit-allow-local-types: Transient request bookkeeping depends on the browser timer API.
interface PendingPlan {
    readonly reject: (error: Error) => void;
    readonly resolve: (
        result: Pick<PlannerResult, "schedule" | "summary">,
    ) => void;
    readonly timeout: ReturnType<typeof globalThis.setTimeout>;
}

/** Owns a lazily created worker and bounds every request's lifetime. */
export class BrowserPlanner {
    private worker: Worker | null = null;
    private nextId = FIRST_REQUEST_ID;
    private readonly pending = new Map<number, PendingPlan>();

    /** Runs scheduling without blocking the main UI thread. */
    public generate(
        payload: PlanGeneratePayload,
    ): Promise<Pick<PlannerResult, "schedule" | "summary">> {
        const WORKER = this.getWorker();
        const ID = this.nextId;
        this.nextId += REQUEST_ID_INCREMENT;
        return new Promise((resolve, reject) => {
            const TIMEOUT = globalThis.setTimeout(() => {
                this.fail("Schedule generation timed out. Please try again.");
            }, REQUEST_TIMEOUT_MS);
            this.pending.set(ID, { reject, resolve, timeout: TIMEOUT });
            try {
                WORKER.postMessage({ id: ID, payload });
            } catch (error) {
                this.fail("Unable to send books to the planner.", error);
            }
        });
    }

    /** Creates a fresh worker after previous transport or startup failures. */
    private getWorker(): Worker {
        if (this.worker) {
            return this.worker;
        }
        const WORKER = new Worker(
            new URL("./planner-worker.ts", import.meta.url),
            { type: "module" },
        );
        WORKER.addEventListener("message", (event: MessageEvent<unknown>) => {
            this.handleMessage(event.data);
        });
        WORKER.addEventListener("error", (event) => {
            event.preventDefault();
            this.fail(
                "The planner could not start. Reload the demo to retry.",
                event.error,
            );
        });
        WORKER.addEventListener("messageerror", () => {
            this.fail(
                "The planner returned an unreadable response. Please try again.",
            );
        });
        this.worker = WORKER;
        return WORKER;
    }

    /** Rejects malformed output and resolves only the matching request. */
    private handleMessage(input: unknown): void {
        try {
            const RESPONSE = parseBrowserPlannerResponse(input);
            const PENDING = this.pending.get(RESPONSE.id);
            if (!PENDING) {
                return;
            }
            globalThis.clearTimeout(PENDING.timeout);
            this.pending.delete(RESPONSE.id);
            if (RESPONSE.ok) {
                PENDING.resolve(RESPONSE.result);
                return;
            }
            PENDING.reject(new Error(RESPONSE.error));
        } catch (error) {
            this.fail(
                "The planner returned an invalid schedule. Please try again.",
                error,
            );
        }
    }

    /** Rejects pending work and releases a failed worker before retrying. */
    private fail(message: string, cause?: unknown): void {
        for (const PENDING of this.pending.values()) {
            globalThis.clearTimeout(PENDING.timeout);
            PENDING.reject(new Error(message, { cause }));
        }
        this.pending.clear();
        this.worker?.terminate();
        this.worker = null;
    }
}
