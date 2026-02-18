import { z } from "zod";

export const ISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected ISO date YYYY-MM-DD");
export const ISODateTimeSchema = z.string().datetime({ offset: true });

export const BookSchema = z.object({
  book_id: z.string().min(1),
  title: z.string().min(1),
  author: z.string().default(""),
  words_total: z.number().int().positive().nullable(),
  pages_total: z.number().int().positive().nullable(),
  pages_read: z.number().int().min(0).nullable(),
  progress_percent: z.number().min(0).max(100).default(0),
  priority: z.number().int().min(1).max(5).default(3),
  difficulty: z.number().int().min(1).max(10).default(3),
  min_blocks_per_session: z.number().int().min(1).default(1),
  max_minutes_per_day: z.number().int().positive().nullable(),
  deadline: ISODateSchema.nullable(),
  cover_url: z.string().default(""),
  cover_local_path: z.string().default(""),
  lookup_note: z.string().default(""),
});

export const SettingsSchema = z.object({
  start_date: ISODateSchema,
  end_date: ISODateSchema,
  minutes_per_day: z.number().int().positive().nullable(),
  wpm_base: z.number().int().positive(),
  time_quantum_minutes: z.number().int().positive(),
  max_sessions_per_day: z.number().int().positive(),
  max_books_per_day: z.number().int().positive(),
  max_blocks_per_book_per_day: z.number().int().positive(),
  w_finish: z.number(),
  w_priority: z.number(),
  w_switch: z.number(),
  w_smooth: z.number(),
  minutes_by_weekday: z.record(z.string(), z.number().int().min(0)),
  days_off: z.array(ISODateSchema),
  difficulty_multiplier: z.record(z.string(), z.number().positive()),
});

export const ScheduleRowSchema = z.object({
  date: ISODateSchema,
  session_index: z.number().int().min(1),
  book_id: z.string().min(1),
  title: z.string().min(1),
  minutes: z.number().int().min(1),
  words_planned: z.number().int().min(0),
});

export const PlannerSummarySchema = z.record(z.string(), z.any());

export const SessionSchema = z.object({
  id: z.string().min(1),
  book_id: z.string().min(1),
  title: z.string().min(1),
  started_at: ISODateTimeSchema,
  ended_at: ISODateTimeSchema,
  minutes: z.number().int().min(1),
  pages_read: z.number().int().min(0).nullable().optional(),
  notes: z.string().default(""),
  source: z.enum(["timer", "manual"]).default("manual"),
  created_at: ISODateTimeSchema,
});

export const PreferencesSchema = z.object({
  theme: z.enum(["system", "light", "dark"]).default("system"),
  reduceMotion: z.boolean().default(false),
  timezone: z.string().default("UTC"),
  dailyGoalMinutes: z.number().int().min(1).max(600).default(30),
  reminderEnabled: z.boolean().default(false),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).default("20:00"),
});

export const FeatureFlagsSchema = z.object({
  gamificationEnabled: z.boolean().default(false),
  socialEnabled: z.boolean().default(false),
  recommendationsEnabled: z.boolean().default(false),
});

export const GeneratePlanPayloadSchema = z.object({
  planner: z.enum(["mip", "greedy"]).default("mip"),
  books: z.array(BookSchema),
  settings: SettingsSchema,
});

export const GeneratePlanResponseSchema = z.object({
  summary: PlannerSummarySchema,
  schedule: z.array(ScheduleRowSchema),
});

export const AppStateSchemaV2 = z.object({
  schemaVersion: z.literal(2),
  books: z.array(BookSchema),
  settings: SettingsSchema,
  sessions: z.array(SessionSchema).default([]),
  preferences: PreferencesSchema,
  featureFlags: FeatureFlagsSchema,
  lastResult: GeneratePlanResponseSchema.nullable(),
  updatedAt: ISODateTimeSchema,
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type Book = z.infer<typeof BookSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;
export type GeneratePlanPayload = z.infer<typeof GeneratePlanPayloadSchema>;
export type GeneratePlanResponse = z.infer<typeof GeneratePlanResponseSchema>;
export type AppStateV2 = z.infer<typeof AppStateSchemaV2>;

export interface PlannerAdapter {
  generatePlan(payload: GeneratePlanPayload): Promise<GeneratePlanResponse>;
  loadState(): Promise<AppStateV2 | null>;
  saveState(state: AppStateV2): Promise<{ ok: true }>;
  searchBooks(query: string): Promise<Array<Record<string, unknown>>>;
  downloadCover(url: string, bookId: string): Promise<string | null>;
}

export function nowIso(): string {
  return new Date().toISOString();
}
