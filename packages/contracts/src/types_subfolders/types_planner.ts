import type { UUID } from "node:crypto";
import type { Book } from "./types_books.ts";
import type { JsonValue, Session } from "./types_core.ts";
import type { FeatureFlags, Preferences } from "./types_experience.ts";
import type { BookLookupItem } from "./types_lookup.ts";

/**
 * Types related to the reading schedule planner feature.
 */
export interface PlannerScheduleRow {
    /**
     * The UUID of the book
     */
    book_id: UUID | string;
    /**
     * The date it is planned for, in YYYY-MM-DD format
     */
    date: string;
    /**
     * Whether the book is finished this session or not
     */
    finish?: boolean;
    /**
     * Number of minutes planned for this book on this date
     */
    minutes: number;
    /**
     * Simply the index associated with a session for a book
     */
    session_index: number;
    /**
     * Book title
     */
    title: string;
    /**
     * Number of words planned for reading
     */
    words_planned: number;
}

/**
 * PlannerSummaryBook helps scheduler see what to report to the user about a session
 */
export interface PlannerSummaryBook {
    /**
     * Whether the book is finished or not
     */
    finished?: boolean;
    /**
     * Number of minutes planned for reading
     */
    minutes_planned?: number;
    /**
     * Number of words planned based on WPM and minutes. Converted for reader
     * to a percentage of the book and a number of pages those words correspond to.
     */
    words_planned?: number;
    /**
     * Total number of words in the book. Used to calculate percentage of the book planned for reading.
     */
    words_total?: number;
}

/**
 * Gives a detailed report of the results of the planner
 * feasibility_warning gives a warning if a solution is non-feasible
 * status gives a general status of the solution (e.g. optimal, infeasible, unknown, unbounded, etc...)
 * total_planned_minutes gives the total number of minutes planned across all books and sessions
 * total_available_minutes gives the total number of minutes available across all days in the
 *     plan based on user set minutes per day and days off
 * per_book gives a breakdown of the summary information for each book in the plan, keyed by book id
 */
export type PlannerSummary = {
    deprecation_notice?: string | null;
    feasibility_warning?: string | null;
    status?: string;
    total_planned_minutes?: number;
    total_available_minutes?: number;
    per_book?: Record<string, PlannerSummaryBook>;
} & Record<string, JsonValue>;

/**
 * Gives a result of the planner
 */
export interface PlannerResult {
    /**
     * Self-explanatory. When the plan was created.
     */
    created_at: string;
    /**
     * The reading schedule returned by the planner
     */
    schedule: PlannerScheduleRow[];
    /**
     * The summary given by the planner
     */
    summary: PlannerSummary | null;
}

/**
 * Which profile of planner to use
 * fast - Uses a greedy algorithm to find a solution as quickly as possible.
 *        This is the only one functional currently, due to huge search spaces
 *        and the sheer complexity of dates, blockers, minutes, etc...
 *        Most will probably never find a solution in a reasonable time unless
 *        they have a very small number of books and a long time horizon.
 *
 * balanced - Uses Mixed Integer Programming with a short time limit. Almost always
 *            never finds ANY solution. So.
 *
 * thorough - Uses Mixed Integer Programming with a long time limit,
 *            allowing it to explore more of the search space and find better solutions.
 *            Still doesnt find any.
 */
export type PlannerSolverProfile = "fast" | "balanced" | "thorough";

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

export interface PlannerStateSnapshot {
    blocked_day_books: Record<string, boolean>;
    books: Book[];
    feature_flags: FeatureFlags;
    last_result: PlannerResult | null;
    preferences: Preferences;
    schedule_completions: Record<string, boolean>;
    sessions: Session[];
    settings: PlannerSettings;
    state_version: number;
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
    state_version?: number;
}

export interface PlanGeneratePayload {
    books: Book[];
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
    | "MIGRATED_JSON_TO_SQLITE"
    | "MIGRATED_STATE_VERSION";

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

export interface PlannerDataExport {
    fileName: string;
    payloadJson: string;
}

export interface PlannerDataImportResult {
    booksRestored: number;
    completionEntriesRestored: number;
    directoriesRestored: number;
    filesRestored: number;
    scheduleRowsRestored: number;
    sessionsRestored: number;
}

export interface PlannerApi {
    downloadCover(
        url: string | undefined,
        bookId: string | undefined,
    ): Promise<string>;
    exportAppData(): Promise<PlannerDataExport>;
    generate(
        payload: PlanGeneratePayload,
    ): Promise<Pick<PlannerResult, "schedule" | "summary">>;
    importAppData(payloadJson: string): Promise<PlannerDataImportResult>;
    loadState(): Promise<PlannerStateLoadResult>;
    resolveCoverSrc(src: string | undefined): string;
    sample(): Promise<Pick<PlannerStateSnapshot, "settings" | "books">>;
    saveState(state: PlannerStateSnapshot): Promise<PlannerSaveResult>;
    saveUploadedCover(
        dataUrl: string | undefined,
        bookId: string | undefined,
    ): Promise<string>;
    searchBooks(query: string, author?: boolean): Promise<BookLookupItem[]>;
    zoomIn(): Promise<number>;
    zoomOut(): Promise<number>;
    zoomReset(): Promise<number>;
}
