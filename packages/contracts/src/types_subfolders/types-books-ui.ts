import type {
    Book,
    BookGroup,
    BookGroupBy,
    BookInput,
    BookStatusFilter,
    SortBy,
    SortDirection,
} from "./types_books.ts";
import type { PlannerScheduleRow } from "./types_planner.ts";

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
    bulkBookIds?: string[];
    defaultShelf?: string;
    mode?: "single" | "bulk";
    navigationBookIds?: string[];
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

export interface BulkBookSubmitPayload {
    bookIds: string[];
    type: "bulk_books";
    updates: BookInput;
}

export type BookDialogSubmitPayload = BookSubmitPayload | BulkBookSubmitPayload;

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
    onMassEditSelection?(bookId: string, selected: boolean): void;
    onRemove(bookId: string): void;
}

export interface BookMassEditOptions {
    active: boolean;
    onBookSelectionChange(bookId: string, selected: boolean): void;
    selectedBookIds: ReadonlySet<string>;
}

export interface CardRenderContext extends CardNavigationActions {
    finishDateByBookId: Record<string, string>;
    massEdit?: BookMassEditOptions;
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
    massEdit?: BookMassEditOptions;
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
    sortBySelect: HTMLSelectElement;
    sortDirectionBtn: HTMLButtonElement;
    statusFilterSelect: HTMLSelectElement;
}

export interface RenderBooksControllerArgs {
    books: Book[];
    dialog: BookDialogController | null;
    findBook(bookId: string): Book | null;
    massEdit?: BookMassEditOptions & {
        syncVisibleBooks(books: Book[]): void;
    };
    onBooksChanged(): void;
    onEstimatedFinishNavigate(dateKey: string): void;
    refs: BooksControllerRefs;
    rerender(): void;
    scheduleRows: PlannerScheduleRow[];
    setBooks(nextBooks: Book[]): void;
    viewState: BooksViewState;
}
