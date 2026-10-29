/** Shared review contracts for connection checks and user-approved Kobo imports. */
import type { KoboProgress, KoboSnapshot } from "../kobo.ts";
import type { Book } from "./types_books.ts";

export interface KoboAssessment {
    kind: "ready" | "link" | "review" | "blocked" | "unchanged";
    reason: string;
}

export interface KoboReviewEntry {
    conflictingRecords: KoboProgress[];
    matches: Book[];
    matchKind: "linked" | "exact" | "fuzzy" | "none";
    record: KoboProgress;
    requiresMatchReview: boolean;
    requiresSourceReview: boolean;
    suggestedBookId: string | null;
}

export interface KoboLibraryMatch {
    book: Book;
    score: number;
}

export interface KoboReviewPresentation {
    addBook(record: KoboProgress): Promise<Book | null>;
    apply(choices: KoboImportChoice[]): Promise<string>;
    books: readonly Book[];
    entries: readonly KoboReviewEntry[];
    ignore(record: KoboProgress): Promise<boolean>;
    invalidRows: number;
}

export interface KoboLibrarySearchOptions {
    getBooks(): readonly Book[];
    onPick(book: Book): void;
    title: string;
}

export interface KoboImportChoice {
    bookId: string;
    record: KoboProgress;
}

export interface KoboImportStore {
    changed(): void;
    flush(): Promise<boolean>;
    getBooks(): Book[];
    replaceBooks(books: Book[]): void;
    save(): Promise<boolean>;
}

export interface KoboMonitorOptions {
    getPath(): string;
    hasModal(): boolean;
    present(
        snapshot: Extract<KoboSnapshot, { status: "connected" }>,
        manual: boolean,
    ): boolean;
    read(databasePath: string): Promise<KoboSnapshot>;
    status(message: string): void;
}
