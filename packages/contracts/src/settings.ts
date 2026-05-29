import { z } from "zod";
import { JSON_VALUE_SCHEMA } from "./shared.ts";
import type { PlannerSettings } from "./types_subfolders/types_planner.ts";

const WEEKDAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const WEEKDAY_SCHEMA = z.enum(WEEKDAY_KEYS);
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const DATE_PART_COUNT = 3;
const MONTH_INDEX_OFFSET = 1;

const MINUTES_BY_WEEKDAY_SCHEMA = z.partialRecord(WEEKDAY_SCHEMA, z.number());
const DAY_OFF_DATE_SCHEMA = z
    .string()
    .regex(DAY_KEY_PATTERN)
    .refine(isCalendarDayKey);

const DIFFICULTY_MULTIPLIER_SCHEMA = z.record(z.string(), z.number());
const SOLVER_PROFILE_SCHEMA = z.enum(["fast", "balanced", "thorough"]);

function dayKeyParts(dayKey: string): [number, number, number] | null {
    const PARTS = dayKey.split("-");
    if (PARTS.length !== DATE_PART_COUNT) {
        return null;
    }
    return [Number(PARTS[0]), Number(PARTS[1]), Number(PARTS[2])];
}

function isCalendarDate(year: number, month: number, day: number): boolean {
    const DATE = new Date(year, month - MONTH_INDEX_OFFSET, day);
    if (DATE.getFullYear() !== year) {
        return false;
    }
    if (DATE.getMonth() !== month - MONTH_INDEX_OFFSET) {
        return false;
    }
    return DATE.getDate() === day;
}

function isCalendarDayKey(dayKey: string): boolean {
    const PARTS = dayKeyParts(dayKey);
    if (PARTS === null) {
        return false;
    }
    const [YEAR, MONTH, DAY] = PARTS;
    return isCalendarDate(YEAR, MONTH, DAY);
}

const PLANNER_SETTINGS_SCHEMA = z
    .object({
        books_show_blocker_meta: z.boolean().optional(),
        books_show_shelf_meta: z.boolean().optional(),
        books_show_word_count: z.boolean().optional(),
        days_off: z.array(DAY_OFF_DATE_SCHEMA).optional(),
        difficulty_multiplier: DIFFICULTY_MULTIPLIER_SCHEMA.optional(),
        end_date: z.string().optional(),
        max_blocks_per_book_per_day: z.number().optional(),
        max_books_per_day: z.number().optional(),
        max_sessions_per_day: z.number().optional(),
        minutes_by_weekday: MINUTES_BY_WEEKDAY_SCHEMA.optional(),
        minutes_per_day: z.number().nullable().optional(),
        plan_mode: z.string().optional(),
        planner_solver_profile: SOLVER_PROFILE_SCHEMA.optional(),
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
