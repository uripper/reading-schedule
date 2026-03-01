import { z } from "zod";
import { JSON_VALUE_SCHEMA } from "./shared.js";

export const PLANNER_SCHEDULE_ROW_SCHEMA = z
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

export const PLANNER_SUMMARY_SCHEMA = z
    .object({
        feasibility_warning: z.string().nullable().optional(),
        per_book: z.record(z.string(), PLANNER_SUMMARY_BOOK_SCHEMA).optional(),
        status: z.string().optional(),
        total_available_minutes: z.number().optional(),
        total_planned_minutes: z.number().optional(),
    })
    .catchall(JSON_VALUE_SCHEMA)
    .nullable();

export const PLAN_GENERATE_RESULT_SCHEMA = z.object({
    schedule: z.array(PLANNER_SCHEDULE_ROW_SCHEMA),
    summary: PLANNER_SUMMARY_SCHEMA,
});
