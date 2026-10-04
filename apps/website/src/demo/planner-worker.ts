/** Executes the shared Rust planner away from the browser's UI thread. */

import type { BrowserPlannerResponse } from "@reading-schedule/contracts";
import {
    parseBrowserPlannerRequest,
    parsePlanGenerateResult,
} from "@reading-schedule/contracts";
import initPlanner, {
    generate_plan_json,
} from "../../../../packages/planner/dist/bartleby_planner.js";

let ready: ReturnType<typeof initPlanner> | null = null;

/** Returns a typed planner failure without exposing runtime internals. */
function errorResponse(id: number, error: unknown): BrowserPlannerResponse {
    let message =
        "Unable to build a schedule. Reset the demo or reload to retry.";
    if (typeof error === "string") {
        message = error;
    }
    if (error instanceof Error) {
        message = error.message;
    }
    return { error: message, id, ok: false };
}

/** Validates requests and forwards JSON to the same solver as desktop. */
async function generateResponse(
    input: unknown,
): Promise<BrowserPlannerResponse> {
    const REQUEST = parseBrowserPlannerRequest(input);
    try {
        ready ??= initPlanner();
        await ready;
        const RESULT: unknown = JSON.parse(
            generate_plan_json(JSON.stringify(REQUEST.payload)),
        );
        return {
            id: REQUEST.id,
            ok: true,
            result: parsePlanGenerateResult(RESULT),
        };
    } catch (error) {
        return errorResponse(REQUEST.id, error);
    }
}

/** An invalid worker request is a protocol failure, reported to the host. */
function handleMessage(event: MessageEvent<unknown>): void {
    generateResponse(event.data)
        .then((response) => {
            globalThis.postMessage(response);
        })
        .catch((error: unknown) => {
            throw new Error("Invalid browser planner request.", {
                cause: error,
            });
        });
}

globalThis.addEventListener("message", handleMessage);
