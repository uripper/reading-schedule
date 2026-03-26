import { z } from "zod";
import { PLAN_GENERATE_RESULT_SCHEMA } from "./planner_result.ts";
import { plannerSettingsSchema } from "./settings.ts";
import type {
    LoadedPlannerState,
    PlannerStateSnapshot,
} from "./types_subfolders/types_planner.ts";

const BOOL_RECORD_SCHEMA = z.record(z.string(), z.boolean());

const FEATURE_FLAGS_SCHEMA = z.object({
    gamificationEnabled: z.boolean(),
    recommendationsEnabled: z.boolean(),
    socialEnabled: z.boolean(),
});

const PREFERENCES_SCHEMA = z.object({
    dailyGoalMinutes: z.number(),
    reduceMotion: z.boolean(),
    reminderEnabled: z.boolean(),
    reminderTime: z.string(),
    theme: z.enum(["system", "light", "dark"]),
    timezone: z.string(),
});

const SESSION_SCHEMA = z.object({
    book_id: z.string(),
    created_at: z.string(),
    ended_at: z.string(),
    id: z.string(),
    minutes: z.number(),
    notes: z.string(),
    pages_read: z.number().nullable(),
    source: z.enum(["timer", "manual"]),
    started_at: z.string(),
    title: z.string(),
});

const PLANNER_STATE_SNAPSHOT_SCHEMA = z.object({
    blocked_day_books: BOOL_RECORD_SCHEMA,
    books: z.array(z.unknown()),
    feature_flags: FEATURE_FLAGS_SCHEMA,
    last_result: PLAN_GENERATE_RESULT_SCHEMA.extend({
        created_at: z.string(),
    }).nullable(),
    preferences: PREFERENCES_SCHEMA,
    schedule_completions: BOOL_RECORD_SCHEMA,
    sessions: z.array(SESSION_SCHEMA),
    settings: plannerSettingsSchema(),
    state_version: z.number().int().nonnegative(),
});

const LOADED_PLANNER_STATE_SCHEMA = z.looseObject({
    blocked_day_books: BOOL_RECORD_SCHEMA.optional(),
    books: z.array(z.unknown()).optional(),
    feature_flags: z.record(z.string(), z.unknown()).optional(),
    last_result: z.record(z.string(), z.unknown()).nullable().optional(),
    preferences: z.record(z.string(), z.unknown()).optional(),
    schedule_completions: BOOL_RECORD_SCHEMA.optional(),
    sessions: z.array(z.record(z.string(), z.unknown())).optional(),
    settings: plannerSettingsSchema().optional(),
    state_version: z.number().int().nonnegative().optional(),
});

export function parsePlannerStateSnapshot(
    input: unknown,
): PlannerStateSnapshot {
    return PLANNER_STATE_SNAPSHOT_SCHEMA.parse(input) as PlannerStateSnapshot;
}

export function safeParseLoadedPlannerState(input: unknown) {
    const RESULT = LOADED_PLANNER_STATE_SCHEMA.safeParse(input);
    if (RESULT.success) {
        return {
            data: RESULT.data as LoadedPlannerState,
            success: true as const,
        };
    }
    return RESULT;
}
