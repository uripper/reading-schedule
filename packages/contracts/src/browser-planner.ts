/** Validated messages exchanged with the browser's scheduling worker. */

import { z } from "zod";
import {
    parsePlanGeneratePayload,
    parsePlanGenerateResult,
} from "./planner.ts";

const REQUEST_SCHEMA = z.object({
    id: z.number().int().positive(),
    payload: z.unknown().transform(parsePlanGeneratePayload),
});

const RESPONSE_SCHEMA = z.discriminatedUnion("ok", [
    z.object({
        id: z.number().int().positive(),
        ok: z.literal(true),
        result: z.unknown().transform(parsePlanGenerateResult),
    }),
    z.object({
        error: z.string(),
        id: z.number().int().positive(),
        ok: z.literal(false),
    }),
]);

export type BrowserPlannerRequest = z.infer<typeof REQUEST_SCHEMA>;
export type BrowserPlannerResponse = z.infer<typeof RESPONSE_SCHEMA>;

/** Validates a request before it crosses the WebAssembly boundary. */
export function parseBrowserPlannerRequest(
    input: unknown,
): BrowserPlannerRequest {
    return REQUEST_SCHEMA.parse(input);
}

/** Validates worker output before returning it to the shared frontend. */
export function parseBrowserPlannerResponse(
    input: unknown,
): BrowserPlannerResponse {
    return RESPONSE_SCHEMA.parse(input);
}
