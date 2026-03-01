import { z } from "zod";
import { type PlannerSettings } from "../types/types.js";
import { JSON_VALUE_SCHEMA } from "./shared.js";

const WEEKDAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const WEEKDAY_SCHEMA = z.enum(WEEKDAY_KEYS);

const MINUTES_BY_WEEKDAY_SCHEMA = z.record(WEEKDAY_SCHEMA, z.number());

const DIFFICULTY_MULTIPLIER_SCHEMA = z.record(z.string(), z.number());

const PLANNER_SETTINGS_SCHEMA = z
    .object({
        books_show_blocker_meta: z.boolean().optional(),
        books_show_shelf_meta: z.boolean().optional(),
        books_show_word_count: z.boolean().optional(),
        days_off: z.array(WEEKDAY_SCHEMA).optional(),
        difficulty_multiplier: DIFFICULTY_MULTIPLIER_SCHEMA.optional(),
        end_date: z.string().optional(),
        max_blocks_per_book_per_day: z.number().optional(),
        max_books_per_day: z.number().optional(),
        max_sessions_per_day: z.number().optional(),
        minutes_by_weekday: MINUTES_BY_WEEKDAY_SCHEMA.optional(),
        minutes_per_day: z.number().nullable().optional(),
        plan_mode: z.string().optional(),
        start_date: z.string().optional(),
        time_quantum_minutes: z.number().optional(),
        w_finish: z.number().optional(),
        w_priority: z.number().optional(),
        w_smooth: z.number().optional(),
        w_switch: z.number().optional(),
        wpm_base: z.number().optional(),
    })
    .catchall(JSON_VALUE_SCHEMA);

export function plannerSettingsSchema() {
    return PLANNER_SETTINGS_SCHEMA;
}

export function parseSettings(input: unknown): PlannerSettings {
    return PLANNER_SETTINGS_SCHEMA.parse(input);
}

export function safeParseSettings(input: unknown) {
    return PLANNER_SETTINGS_SCHEMA.safeParse(input);
}
