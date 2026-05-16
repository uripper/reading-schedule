import type { UUID } from "node:crypto";
import type { PlannerScheduleRow } from "./types_planner.ts";

export type BookStatusFilter = "all" | BookStatus;

export type SortBy =
    | "title"
    | "author"
    | "pages_total"
    | "pages_read"
    | "words_total"
    | "progress_percent"
    | "priority"
    | "difficulty"
    | "deadline"
    | "estimated_finish"
    | "shelf";

export type SortDirection = "asc" | "desc";

export type OptionalNumber = number | null | undefined;

export type OptionalString = string | null | undefined;

export type BookInput = Partial<Book>;

export type BookStatus = "to_read" | "in_progress" | "read" | "dropped";

export interface Book {
    author: string;
    blocked_by: string | null;
    book_id: UUID | string;
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
    remaining_words?: number | null;
    scheduled_days: string[];
    shelf: string;
    status: BookStatus;
    title: string;
    words_total: number | null;
}

export interface BookProgressUpdates {
    pagesRead?: number | null;
    progressPercent?: number | null;
    remainingWords?: number | null;
}

export interface BookMetaOptions {
    finishDateByBookId?: Record<string, string>;
    showBlockerMeta?: boolean;
    showShelfMeta?: boolean;
    showWordCount?: boolean;
    titleById?: Record<string, string>;
}

export interface ProgressTotals {
    hasPagesTotal: boolean;
    pagesTotal: number;
}

export interface PercentUpdateContext extends ProgressTotals {
    hasPagesUpdate: boolean;
}

export interface PagesUpdateResult {
    book: Book;
    hasPagesUpdate: boolean;
}

export interface GroupMeta {
    key: string;
    label: string;
    order: number;
    tie: string;
}

export type BookGroupBy =
    | "none"
    | "shelf"
    | "finish_date"
    | "title_letter"
    | "author";

export type GroupBucket = GroupMeta & {
    books: Book[];
};

export interface BookGroup {
    books: Book[];
    key: string;
    label: string;
}

export interface BlockerMeta {
    blockerBookId: string;
    label: string;
}

export type BookWeekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface DialogFocusBinding {
    closeAndReturnFocus(): void;
    focusInitialTarget(): void;
    rememberOpener(): void;
}

export type SortComparator = (
    leftBook: Book,
    rightBook: Book,
    finishDateByBookId: Record<string, string>,
) => number;

export interface BookFormRefs {
    afterBookInput: HTMLInputElement;
    afterBookResults: HTMLElement;
    applyScheduledDaysToShelfInput: HTMLInputElement;
    author: HTMLInputElement;
    blockedByInput: HTMLInputElement;
    bookId: HTMLInputElement;
    cancelBtn: HTMLButtonElement;
    coverLocal: HTMLInputElement;
    coverPanel: HTMLElement;
    coverPreview: HTMLImageElement;
    coverUploadInput: HTMLInputElement;
    coverUrl: HTMLInputElement;
    deadlineInput: HTMLInputElement;
    dialog: HTMLDialogElement;
    dialogTitle: HTMLElement;
    difficultyInput: HTMLInputElement;
    finishedAtField: HTMLElement;
    finishedAtInput: HTMLInputElement;
    form: HTMLFormElement;
    lookupMeta: HTMLElement;
    maxMinutesInput: HTMLInputElement;
    minBlocksInput: HTMLInputElement;
    pagesReadInput: HTMLInputElement;
    pagesTotalInput: HTMLInputElement;
    priorityInput: HTMLInputElement;
    progressInput: HTMLInputElement;
    saveBtn: HTMLButtonElement;
    scheduledDaysField: HTMLElement;
    searchInput: HTMLInputElement;
    searchResults: HTMLElement;
    shelfPromptDialog: HTMLDialogElement;
    shelfPromptForm: HTMLFormElement;
    shelfPromptInput: HTMLInputElement;
    shelfSelectInput: HTMLSelectElement;
    statusSelectInput: HTMLSelectElement;
    titleInput: HTMLInputElement;
    wordsInput: HTMLInputElement;
}

export interface BookDialogOptions {
    getBooks?(): Book[];
}

export interface LookupControl {
    clearResults(): void;
}

export interface AfterBookPickerControl {
    openForBook(book: Book | null): void;
}

export interface OpenDialogOptions {
    defaultShelf?: string;
}

export interface OpenBookDialogArgs {
    afterBookPicker: AfterBookPickerControl;
    book: Book | null;
    dialogFocus: DialogFocusBinding;
    dialogOptions: OpenDialogOptions;
    getBooks(): Book[];
    lookupControl: LookupControl;
    refs: BookFormRefs;
}

export interface BookSubmitPayload {
    applyScheduledDaysToShelf: boolean;
    book: Book;
}

export interface ProgressSyncRefs {
    pagesReadInput: HTMLInputElement;
    pagesTotalInput: HTMLInputElement;
    progressInput: HTMLInputElement;
}

export interface OptionDefinition {
    label: string;
    value: string;
}

export interface PickerState {
    activeIndex: number;
    currentBookId: string;
    filtered: Book[];
    options: Book[];
    selectedBookId: string;
}

export interface BindingArgs {
    clearResults(): void;
    refreshFiltered(clearChangedSelection: boolean): void;
    refs: BookFormRefs;
    render(): void;
    selectBook(book: Book | null | undefined): void;
    state: PickerState;
}

export interface PickerInteraction {
    targetIsInput: boolean;
    targetIsInResults: boolean;
}

export type GetBooks = () => Book[];

export interface AfterBookPicker {
    openForBook(book?: Book | null): void;
}

export interface HoloPointerVars {
    bgShiftX: string;
    bgShiftY: string;
    pointerX: string;
    pointerY: string;
}

export interface CardNavigationActions {
    onEstimatedFinishNavigate(dateKey: string): void;
}

export interface CardHandlers {
    onEdit(bookId: string): void;
    onRemove(bookId: string): void;
}

export interface CardRenderContext extends CardNavigationActions {
    finishDateByBookId: Record<string, string>;
    showBlockerMeta: boolean;
    showShelfMeta: boolean;
    showWordCount: boolean;
    titleById: Record<string, string>;
}

export interface ScrollSettleState {
    lastLeft: number;
    lastTop: number;
    stableFrames: number;
    startedAtMs: number;
}

export interface RenderBookGridOptions {
    allBooks?: Book[];
    books: Book[];
    empty: HTMLElement;
    finishDateByBookId?: Record<string, string>;
    grid: HTMLElement;
    groups?: BookGroup[];
    onEdit(bookId: string): void;
    onEstimatedFinishNavigate(dateKey: string): void;
    onRemove(bookId: string): void;
    showBlockerMeta?: boolean;
    showShelfMeta?: boolean;
    showWordCount?: boolean;
}

export interface StatusGroupDefinition {
    label: string;
    statuses: string[];
}

export interface UpdateBookProgressOptions {
    completedAt?: string;
    notifyBooksChanged?: boolean;
}

export interface BindBooksUIOptions {
    onEstimatedFinishNavigate?(this: void, dateKey: string): void;
}

export interface BooksControllerRefs {
    addBtn: HTMLButtonElement | null;
    empty: HTMLElement | null;
    grid: HTMLElement | null;
    groupBySelect: HTMLSelectElement | null;
    shelfFilterSelect: HTMLSelectElement | null;
    sortBySelect: HTMLSelectElement | null;
    sortDirectionBtn: HTMLButtonElement | null;
    statusFilterSelect: HTMLSelectElement | null;
    titleFilterInput: HTMLInputElement | null;
    toolbar: HTMLElement | null;
}

export interface BookDialogController {
    open(book?: Book | null, options?: OpenDialogOptions): void;
}

export interface BooksViewState {
    groupBy: BookGroupBy;
    shelfFilter: string;
    sortBy: SortBy;
    sortDirection: SortDirection;
    statusFilter: BookStatusFilter;
    titleFilter: string;
}

export interface BindToolbarEventsArgs {
    refs: BooksControllerRefs;
    rerender(): void;
    viewState: BooksViewState;
}

export interface RenderableBooksRefs {
    empty: HTMLElement;
    grid: HTMLElement;
    groupBySelect: HTMLSelectElement;
    shelfFilterSelect: HTMLSelectElement;
    sortDirectionBtn: HTMLButtonElement;
    statusFilterSelect: HTMLSelectElement;
}

export interface RenderBooksControllerArgs {
    books: Book[];
    dialog: BookDialogController | null;
    findBook(bookId: string): Book | null;
    onBooksChanged(): void;
    onEstimatedFinishNavigate(dateKey: string): void;
    refs: BooksControllerRefs;
    rerender(): void;
    scheduleRows: PlannerScheduleRow[];
    setBooks(nextBooks: Book[]): void;
    viewState: BooksViewState;
}
