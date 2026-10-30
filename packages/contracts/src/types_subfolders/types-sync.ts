/** Shared review contracts for user-approved imports from any sync provider. */
import type { SyncImportChoice, SyncRecord } from "../sync.ts";
import type { Book } from "./types_books.ts";

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
}
