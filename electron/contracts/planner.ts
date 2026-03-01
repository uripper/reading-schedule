import { z } from "zod";
import {
    type JsonValue,
    type PlanGeneratePayload,
    type PlannerResult,
    type PlannerStateSnapshot,
} from "../types/types.js";
import { plannerSettingsSchema } from "./settings.js";
import { JSON_VALUE_SCHEMA, schemaErrorMessage } from "./shared.js";

const BRIDGE_RESPONSE_ENVELOPE_SCHEMA = z
    .object({
        data: JSON_VALUE_SCHEMA.optional(),
        error: z.string().optional(),
        ok: z.boolean().optional(),
    })
    .passthrough();

const PLANNER_SCHEDULE_ROW_SCHEMA = z
    .object({
        book_id: z.string(),
        date: z.string(),
        finish: z.boolean().optional(),
        minutes: z.number(),
        session_index: z.number(),
        title: z.string(),
        words_planned: z.number(),
    })
    .passthrough();

const PLANNER_SUMMARY_BOOK_SCHEMA = z
    .object({
        finished: z.boolean().optional(),
        minutes_planned: z.number().optional(),
        words_planned: z.number().optional(),
        words_total: z.number().optional(),
    })
    .passthrough();

const PLANNER_SUMMARY_SCHEMA = z
    .object({
        feasibility_warning: z.string().nullable().optional(),
        per_book: z.record(z.string(), PLANNER_SUMMARY_BOOK_SCHEMA).optional(),
        status: z.string().optional(),
        total_available_minutes: z.number().optional(),
        total_planned_minutes: z.number().optional(),
    })
    .catchall(JSON_VALUE_SCHEMA)
    .nullable();

const PLAN_GENERATE_PAYLOAD_SCHEMA = z.object({
    books: z.array(z.unknown()),
    planner: z.literal("mip"),
    settings: plannerSettingsSchema(),
});

const PLAN_GENERATE_RESULT_SCHEMA = z.object({
    schedule: z.array(PLANNER_SCHEDULE_ROW_SCHEMA),
    summary: PLANNER_SUMMARY_SCHEMA,
});

const SAMPLE_PAYLOAD_SCHEMA = z.object({
    books: z.array(z.unknown()),
    settings: plannerSettingsSchema(),
});

export function parseBridgeResponseEnvelope(input: unknown): {
    data?: JsonValue;
    error?: string;
    ok?: boolean;
} {
    const RESULT = BRIDGE_RESPONSE_ENVELOPE_SCHEMA.safeParse(input);
    if (RESULT.success) {
        return RESULT.data;
    }
    throw new Error(
        schemaErrorMessage("Planner bridge envelope", RESULT.error.issues),
    );
}

export function parsePlanGeneratePayload(input: unknown): PlanGeneratePayload {
    const RESULT = PLAN_GENERATE_PAYLOAD_SCHEMA.safeParse(input);
    if (RESULT.success) {
        return RESULT.data as PlanGeneratePayload;
    }
    throw new Error(
        schemaErrorMessage("Planner generate payload", RESULT.error.issues),
    );
}

export function parsePlanGenerateResult(
    input: unknown,
): Pick<PlannerResult, "schedule" | "summary"> {
    const RESULT = PLAN_GENERATE_RESULT_SCHEMA.safeParse(input);
    if (RESULT.success) {
        return RESULT.data as Pick<PlannerResult, "schedule" | "summary">;
    }
    throw new Error(
        schemaErrorMessage("Planner generate response", RESULT.error.issues),
    );
}

export function parseSamplePayload(
    input: unknown,
): Pick<PlannerStateSnapshot, "books" | "settings"> {
    const RESULT = SAMPLE_PAYLOAD_SCHEMA.safeParse(input);
    if (RESULT.success) {
        return RESULT.data as Pick<PlannerStateSnapshot, "books" | "settings">;
    }
    throw new Error(
        schemaErrorMessage("Planner sample response", RESULT.error.issues),
    );
}
