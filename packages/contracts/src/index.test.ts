import { describe, expect, it } from "vitest";
import { AppStateSchemaV2, GeneratePlanPayloadSchema } from "./index";

describe("contracts", () => {
  it("parses minimal generate plan payload", () => {
    const parsed = GeneratePlanPayloadSchema.parse({
      planner: "mip",
      books: [
        {
          book_id: "book-1",
          title: "Test",
          author: "",
          words_total: 1000,
          pages_total: null,
          pages_read: null,
          progress_percent: 0,
          priority: 3,
          difficulty: 3,
          min_blocks_per_session: 1,
          max_minutes_per_day: null,
          deadline: null,
          cover_url: "",
          cover_local_path: "",
          lookup_note: "",
        },
      ],
      settings: {
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        minutes_per_day: 30,
        wpm_base: 200,
        time_quantum_minutes: 15,
        max_sessions_per_day: 4,
        max_books_per_day: 2,
        max_blocks_per_book_per_day: 2,
        w_finish: 1,
        w_priority: 1,
        w_switch: 1,
        w_smooth: 1,
        minutes_by_weekday: { Mon: 30 },
        days_off: [],
        difficulty_multiplier: { "1": 1 },
      },
    });
    expect(parsed.planner).toBe("mip");
  });

  it("parses v2 state", () => {
    const state = AppStateSchemaV2.parse({
      schemaVersion: 2,
      books: [],
      settings: {
        start_date: "2026-01-01",
        end_date: "2026-01-31",
        minutes_per_day: 30,
        wpm_base: 200,
        time_quantum_minutes: 15,
        max_sessions_per_day: 4,
        max_books_per_day: 2,
        max_blocks_per_book_per_day: 2,
        w_finish: 1,
        w_priority: 1,
        w_switch: 1,
        w_smooth: 1,
        minutes_by_weekday: { Mon: 30 },
        days_off: [],
        difficulty_multiplier: { "1": 1 },
      },
      sessions: [],
      preferences: {
        theme: "system",
        reduceMotion: false,
        timezone: "UTC",
        dailyGoalMinutes: 30,
        reminderEnabled: false,
        reminderTime: "20:00",
      },
      featureFlags: {
        gamificationEnabled: false,
        socialEnabled: false,
        recommendationsEnabled: false,
      },
      lastResult: null,
      updatedAt: new Date().toISOString(),
    });
    expect(state.schemaVersion).toBe(2);
  });
});
