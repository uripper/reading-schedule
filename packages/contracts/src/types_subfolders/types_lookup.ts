export interface BookLookupItem {
    author?: string;
    cover_url?: string;
    pages_estimate?: number;
    source?: string;
    title?: string;
    words_estimate?: number;
    year?: string | number;
}

export interface LookupSearchState {
    activeIndex: number;
    currentItems: BookLookupItem[];
    timer: ReturnType<typeof setTimeout> | null;
    token: number;
}

export interface LookupBinding {
    clearResults(): void;
    destroy(): void;
}

export interface BindBookLookupOptions {
    metaEl: HTMLElement;
    onPick(this: void, item: BookLookupItem): void;
    resultsEl: HTMLElement;
    searchInput: HTMLInputElement;
}

export interface ProgressSyncInputs {
    pagesReadInput: HTMLInputElement;
    pagesTotalInput: HTMLInputElement;
    progressInput: HTMLInputElement;
}

export type ProgressField = "pages" | "progress";

export interface LookupInputHandlerArgs {
    clearResults(this: void): void;
    metaEl: HTMLElement;
    refreshResults(this: void): void;
    searchInput: HTMLInputElement;
    state: LookupSearchState;
}

export type SetActiveIndex = (index: number) => void;

export type SelectItem = (index: number) => void;

export interface HandleLookupKeydownArgs {
    activeIndex: number;
    clearResults(): void;
    currentItems: readonly BookLookupItem[];
    event: KeyboardEvent;
    searchInput: HTMLInputElement;
    selectItem: SelectItem;
    setActiveIndex: SetActiveIndex;
}

export interface LookupRenderState {
    activeIndex: number;
    currentItems: BookLookupItem[];
}

export interface CreateLookupStateControllerArgs {
    metaEl: HTMLElement;
    onPick(this: void, item: BookLookupItem): void;
    placeholder: string;
    resultsEl: HTMLElement;
    searchInput: HTMLInputElement;
    state: LookupRenderState;
}

export interface LookupStateController {
    clearResults(): void;
    refreshResults(): void;
    selectItem(index: number): void;
    setActiveIndex(index: number): void;
}

export type CoverExtension = ".jpg" | ".png" | ".webp";

export interface SearchDoc {
    author_name?: string[];
    cover_i?: number;
    edition_count?: number;
    first_publish_year?: number;
    key?: string;
    language?: string[];
    number_of_pages_median?: number;
    title?: string;
}

export interface SearchResponse {
    docs?: SearchDoc[];
}

/**
 * Minimal response shape needed to collect docs from Open Library lookups.
 */
export interface SearchResponseDocsShape {
    docs?: unknown;
}

export interface SearchItem {
    author: string;
    cover_url: string;
    openlibrary_key: string;
    pages_estimate: number | null;
    source: string;
    title: string;
    words_estimate: number | null;
    year: number | "";
}

/**
 * Ranked Open Library document plus the score assigned by the lookup pipeline.
 */
export interface ScoredDoc {
    doc: SearchDoc;
    score: number;
}

/**
 * Response payload used when downloading a remote cover image for a book.
 */
export interface DownloadedCover {
    bytes: ArrayBuffer;
    contentType: string | null;
}

/**
 * Input required to fetch and persist a downloaded cover image.
 */
export interface DownloadCoverInput {
    parsedUrl: URL;
    userDataDir: string;
}

export type SearchDocsResponse =
    PromiseSettledResult<SearchResponseDocsShape>[];
