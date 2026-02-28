import type { PlannerScheduleRow } from "./types_planner.js";

export type BookStatus = "to_read" | "in_progress" | "read" | "dropped";

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

export interface Book {
	book_id: string;
	title: string;
	author: string;
	words_total: number | null;
	pages_total: number | null;
	pages_read: number | null;
	progress_percent: number;
	priority: number;
	difficulty: number;
	min_blocks_per_session: number;
	max_minutes_per_day: number | null;
	deadline: string | null;
	blocked_by: string | null;
	shelf: string;
	scheduled_days: string[];
	status: BookStatus;
	finished_at: string | null;
	cover_url: string;
	cover_local_path: string;
	lookup_note: string;
}

export type BookInput = Partial<Book>;

export interface BookProgressUpdates {
	pagesRead?: number | null;
	progressPercent?: number | null;
}

export interface BookMetaOptions {
	titleById?: Record<string, string>;
	finishDateByBookId?: Record<string, string>;
	showShelfMeta?: boolean;
	showBlockerMeta?: boolean;
	showWordCount?: boolean;
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
	key: string;
	label: string;
	books: Book[];
}

export interface BlockerMeta {
	blockerBookId: string;
	label: string;
}

export type BookWeekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface DialogFocusBinding {
	rememberOpener(): void;
	focusInitialTarget(): void;
	closeAndReturnFocus(): void;
}

export type SortComparator = (
	leftBook: Book,
	rightBook: Book,
	finishDateByBookId: Record<string, string>,
) => number;

export interface BookFormRefs {
	dialog: HTMLDialogElement;
	dialogTitle: HTMLElement;
	form: HTMLFormElement;
	bookId: HTMLInputElement;
	coverUrl: HTMLInputElement;
	coverLocal: HTMLInputElement;
	author: HTMLInputElement;
	searchInput: HTMLInputElement;
	searchResults: HTMLElement;
	lookupMeta: HTMLElement;
	coverPanel: HTMLElement;
	coverUploadInput: HTMLInputElement;
	titleInput: HTMLInputElement;
	wordsInput: HTMLInputElement;
	pagesTotalInput: HTMLInputElement;
	pagesReadInput: HTMLInputElement;
	progressInput: HTMLInputElement;
	priorityInput: HTMLInputElement;
	difficultyInput: HTMLInputElement;
	minBlocksInput: HTMLInputElement;
	maxMinutesInput: HTMLInputElement;
	deadlineInput: HTMLInputElement;
	afterBookInput: HTMLInputElement;
	afterBookResults: HTMLElement;
	blockedByInput: HTMLInputElement;
	statusSelectInput: HTMLSelectElement;
	finishedAtField: HTMLElement;
	finishedAtInput: HTMLInputElement;
	shelfSelectInput: HTMLSelectElement;
	scheduledDaysField: HTMLElement;
	applyScheduledDaysToShelfInput: HTMLInputElement;
	shelfPromptDialog: HTMLDialogElement;
	shelfPromptForm: HTMLFormElement;
	shelfPromptInput: HTMLInputElement;
	coverPreview: HTMLImageElement;
	saveBtn: HTMLButtonElement;
	cancelBtn: HTMLButtonElement;
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
	refs: BookFormRefs;
	dialogFocus: DialogFocusBinding;
	lookupControl: LookupControl;
	afterBookPicker: AfterBookPickerControl;
	getBooks(): Book[];
	book: Book | null;
	dialogOptions: OpenDialogOptions;
}

export interface BookSubmitPayload {
	book: Book;
	applyScheduledDaysToShelf: boolean;
}

export interface ProgressSyncRefs {
	pagesTotalInput: HTMLInputElement;
	pagesReadInput: HTMLInputElement;
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
	refs: BookFormRefs;
	refreshFiltered(clearChangedSelection: boolean): void;
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
	pointerX: string;
	pointerY: string;
	bgShiftX: string;
	bgShiftY: string;
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
	grid: HTMLElement;
	empty: HTMLElement;
	books: Book[];
	groups?: BookGroup[];
	allBooks?: Book[];
	finishDateByBookId?: Record<string, string>;
	onEstimatedFinishNavigate(dateKey: string): void;
	showBlockerMeta?: boolean;
	showShelfMeta?: boolean;
	showWordCount?: boolean;
	onEdit(bookId: string): void;
	onRemove(bookId: string): void;
}

export interface StatusGroupDefinition {
	label: string;
	statuses: string[];
}

export interface UpdateBookProgressOptions {
	notifyBooksChanged?: boolean;
}

export interface BindBooksUIOptions {
	onEstimatedFinishNavigate?(this: void, dateKey: string): void;
}

export interface BooksControllerRefs {
	toolbar: HTMLElement | null;
	grid: HTMLElement | null;
	empty: HTMLElement | null;
	addBtn: HTMLButtonElement | null;
	titleFilterInput: HTMLInputElement | null;
	shelfFilterSelect: HTMLSelectElement | null;
	statusFilterSelect: HTMLSelectElement | null;
	sortBySelect: HTMLSelectElement | null;
	groupBySelect: HTMLSelectElement | null;
	sortDirectionBtn: HTMLButtonElement | null;
}

export interface BookDialogController {
	open(book?: Book | null, options?: OpenDialogOptions): void;
}

export interface BooksViewState {
	titleFilter: string;
	shelfFilter: string;
	statusFilter: BookStatusFilter;
	sortBy: SortBy;
	groupBy: BookGroupBy;
	sortDirection: SortDirection;
}

export interface BindToolbarEventsArgs {
	refs: BooksControllerRefs;
	viewState: BooksViewState;
	rerender(): void;
}

export interface RenderableBooksRefs {
	shelfFilterSelect: HTMLSelectElement;
	groupBySelect: HTMLSelectElement;
	statusFilterSelect: HTMLSelectElement;
	sortDirectionBtn: HTMLButtonElement;
	grid: HTMLElement;
	empty: HTMLElement;
}

export interface RenderBooksControllerArgs {
	refs: BooksControllerRefs;
	books: Book[];
	scheduleRows: PlannerScheduleRow[];
	viewState: BooksViewState;
	dialog: BookDialogController | null;
	onBooksChanged(): void;
	onEstimatedFinishNavigate(dateKey: string): void;
	setBooks(nextBooks: Book[]): void;
	findBook(bookId: string): Book | null;
	rerender(): void;
}
