export type JsonPrimitive = string | number | boolean | null;

export type JsonArray = JsonValue[];

export interface JsonObject {
    [key: string]: JsonValue;
}

export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

export interface Book {
    author: string;
    blocked_by: string | null;
    book_id: string;
    cover_local_path: string;
    cover_url: string;
    deadline: string | null;
    difficulty: number;
    finished_at: string | null;
    lookup_note: string;
    max_minutes_per_day: number | null;
    min_blocks_per_session: number;
    pages_read: number | null;
    pages_total: number | null;
    priority: number;
    progress_percent: number;
    scheduled_days: string[];
    shelf: string;
    status: "to_read" | "in_progress" | "read" | "dropped";
    title: string;
    words_total: number | null;
}

export interface Session {
    book_id: string;
    created_at: string;
    ended_at: string;
    id: string;
    minutes: number;
    notes: string;
    pages_read: number | null;
    source: "timer" | "manual";
    started_at: string;
    title: string;
}

export interface FeatureFlags {
    gamificationEnabled: boolean;
    recommendationsEnabled: boolean;
    socialEnabled: boolean;
}

export interface Preferences {
    dailyGoalMinutes: number;
    reduceMotion: boolean;
    reminderEnabled: boolean;
    reminderTime: string;
    theme: "system" | "light" | "dark";
    timezone: string;
}

export type PlannerSolverProfile = "fast" | "balanced" | "thorough";

export type PlannerToken = "mip" | "mip-fast" | "mip-balanced" | "mip-thorough";

export type PlannerSettings = {
    start_date?: string;
    end_date?: string;
    plan_mode?: string;
    minutes_per_day?: number | null;
    wpm_base?: number;
    time_quantum_minutes?: number;
    max_sessions_per_day?: number;
    max_books_per_day?: number;
    max_blocks_per_book_per_day?: number;
    w_finish?: number;
    w_priority?: number;
    w_switch?: number;
    w_smooth?: number;
    minutes_by_weekday?: Record<string, number>;
    days_off?: string[];
    difficulty_multiplier?: Record<string, number>;
    books_show_word_count?: boolean;
    books_show_blocker_meta?: boolean;
    books_show_shelf_meta?: boolean;
    planner_solver_profile?: PlannerSolverProfile;
} & Record<string, JsonValue>;

export interface PlannerScheduleRow {
    book_id: string;
    date: string;
    finish?: boolean;
    minutes: number;
    session_index: number;
    title: string;
    words_planned: number;
}

export interface PlannerSummaryBook {
    finished?: boolean;
    minutes_planned?: number;
    words_planned?: number;
    words_total?: number;
}

export type PlannerSummary = {
    feasibility_warning?: string | null;
    status?: string;
    total_planned_minutes?: number;
    total_available_minutes?: number;
    per_book?: Record<string, PlannerSummaryBook>;
} & Record<string, JsonValue>;

export interface PlannerResult {
    created_at: string;
    schedule: PlannerScheduleRow[];
    summary: PlannerSummary | null;
}

export interface PlannerStateSnapshot {
    blocked_day_books: Record<string, boolean>;
    books: Book[];
    feature_flags: FeatureFlags;
    last_result: PlannerResult | null;
    preferences: Preferences;
    schedule_completions: Record<string, boolean>;
    sessions: Session[];
    settings: PlannerSettings;
}

export interface LoadedPlannerState {
    blocked_day_books?: Record<string, boolean>;
    books?: Book[];
    feature_flags?: Partial<FeatureFlags>;
    last_result?: PlannerResult | null;
    preferences?: Partial<Preferences>;
    schedule_completions?: Record<string, boolean>;
    sessions?: Session[];
    settings?: PlannerSettings;
}

export interface PlanGeneratePayload {
    books: Book[];
    planner: PlannerToken;
    settings: PlannerSettings;
}

export type PlannerStateLoadSource =
    | "sqlite"
    | "sqlite_journal_replay"
    | "json_primary"
    | "json_backup"
    | "fresh";

export type PlannerStateLoadWarningCode =
    | "RECOVERED_FROM_BACKUP"
    | "RECOVERED_FROM_JOURNAL"
    | "STATE_RESET_FRESH"
    | "MIGRATED_JSON_TO_SQLITE";

export interface PlannerStateLoadResult {
    source: PlannerStateLoadSource;
    sourcePath?: string;
    state: LoadedPlannerState | null;
    warningCode?: PlannerStateLoadWarningCode;
    warningMessage?: string;
}

export interface PlannerSaveResult {
    error?: string;
    ok?: boolean;
    warningCode?: PlannerStateLoadWarningCode;
    warningMessage?: string;
}

export interface BookLookupItem {
    author: string;
    cover_url?: string;
    title: string;
    work_id: string;
}

export interface PlannerApi {
    downloadCover(
        url: string | undefined,
        bookId: string | undefined,
    ): Promise<string>;
    generate(
        payload: PlanGeneratePayload,
    ): Promise<Pick<PlannerResult, "schedule" | "summary">>;
    loadState(): Promise<PlannerStateLoadResult>;
    sample(): Promise<Pick<PlannerStateSnapshot, "settings" | "books">>;
    saveState(state: PlannerStateSnapshot): Promise<PlannerSaveResult>;
    saveUploadedCover(
        dataUrl: string | undefined,
        bookId: string | undefined,
    ): Promise<string>;
    searchBooks(query: string, author?: boolean): Promise<BookLookupItem[]>;
}
