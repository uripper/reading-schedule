/** Shared review contracts for user-approved imports from any sync provider. */
import type { SyncImportChoice, SyncRecord } from "../sync.ts";
import type {
    BlockedDayBookState,
    PlannerResultState,
    ScheduleCompletionState,
} from "./types_app_shared.ts";
import type { Book } from "./types_books.ts";
import type { PlannerSettings } from "./types_planner.ts";

/** Schedule fields staged together when a sync also records completed reading time. */
export interface SyncSessionState
    extends BlockedDayBookState,
        PlannerResultState,
        ScheduleCompletionState {}

/** Accepted source choices and library metadata used to log their completed sessions. */
export interface SyncSessionImport {
    books: readonly Book[];
    choices: readonly SyncImportChoice[];
    settings: PlannerSettings;
}

export interface SyncReviewEntry {
    conflictingRecords: SyncRecord[];
    matches: Book[];
    matchKind: "linked" | "exact" | "fuzzy" | "none";
    record: SyncRecord;
    requiresMatchReview: boolean;
    requiresSourceReview: boolean;
    suggestedBookId: string | null;
}

export interface SyncLibraryMatch {
    book: Book;
    score: number;
}

export interface SyncReviewPresentation {
    addBook(record: SyncRecord): Promise<Book | null>;
    apply(choices: SyncImportChoice[]): Promise<string>;
    books: readonly Book[];
    entries: readonly SyncReviewEntry[];
    ignore(record: SyncRecord): Promise<boolean>;
    invalidRows: number;
    /** Names the source in the title, comparisons, and errors, such as "Kobo". */
    sourceLabel: string;
}

export interface SyncLibrarySearchOptions {
    author?: string;
    getBooks(): readonly Book[];
    onPick(book: Book): void;
    title: string;
}

export interface SyncImportStore {
    changed(): void;
    flush(): Promise<boolean>;
    getBooks(): Book[];
    replaceBooks(books: Book[]): void;
    save(): Promise<boolean>;
    /** Stages completed sessions for accepted choices; returns rollback for a failed save. */
    stageSessions?(choices: readonly SyncImportChoice[]): () => void;
}
