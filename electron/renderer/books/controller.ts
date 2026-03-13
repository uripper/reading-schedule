import type {
    BindBooksUIOptions,
    Book,
    BookDialogController,
    BookProgressUpdates,
    BookSubmitPayload,
    BooksControllerRefs,
    BooksViewState,
    PlannerScheduleRow,
    UpdateBookProgressOptions,
} from "../../types/types.ts";
import { el } from "../dom.ts";
import { bindToolbarEvents } from "./controller_bindings.ts";
import { renderBooksController } from "./controller_render.ts";
import { defaultShelfForAddDialog } from "./controller_types.ts";
import { createBookDialog } from "./dialog.ts";
import { GROUP_BY_NONE } from "./grouping.ts";
import {
    clearMissingBlockedBy,
    hasSchedulableLength,
    normalizeBook,
    toPayloadBook,
} from "./model.ts";
import { withUpdatedProgress } from "./progress.ts";
import { hydrateBookCover, upsertBookById } from "./save.ts";
import { applyScheduledDaysToShelfBooks } from "./save_scheduled_days.ts";
import { schedulableBook } from "./status.ts";
import { BOOK_STATUS_FILTER_ALL } from "./status_catalog.ts";
import {
    ensureBooksToolbarControls,
    SORT_BY_TITLE,
    SORT_DIRECTION_ASC,
} from "./toolbar.ts";

let books: Book[] = [];
let scheduleRows: PlannerScheduleRow[] = [];
const DEFAULT_ON_BOOKS_CHANGED = (): void => {
    // No-op default callback.
};
const DEFAULT_ON_BOOKS_COMMITTED = (_books: Book[]): void => {
    // No-op default callback.
};
const DEFAULT_ON_ESTIMATED_FINISH_NAVIGATE = (_dateKey: string): void => {
    // No-op default callback.
};
let onBooksChanged: () => void = DEFAULT_ON_BOOKS_CHANGED;
let onBooksCommitted: (books: Book[]) => void = DEFAULT_ON_BOOKS_COMMITTED;
let onEstimatedFinishNavigate: (dateKey: string) => void =
    DEFAULT_ON_ESTIMATED_FINISH_NAVIGATE;
let dialog: BookDialogController | null = null;

const REFS: BooksControllerRefs = {
    addBtn: null,
    empty: null,
    grid: null,
    groupBySelect: null,
    shelfFilterSelect: null,
    sortBySelect: null,
    sortDirectionBtn: null,
    statusFilterSelect: null,
    titleFilterInput: null,
    toolbar: null,
};

const VIEW_STATE: BooksViewState = {
    groupBy: GROUP_BY_NONE,
    shelfFilter: "",
    sortBy: SORT_BY_TITLE,
    sortDirection: SORT_DIRECTION_ASC,
    statusFilter: BOOK_STATUS_FILTER_ALL,
    titleFilter: "",
};

/**
 * Replaces the in-memory books collection used by the books controller.
 * @param nextBooks - Books to render and edit in the current session.
 */
function setBooks(nextBooks: Book[]): void {
    books = nextBooks;
    onBooksCommitted(books);
}

/**
 * Finds a mutable in-memory book by id.
 * @param bookId - Stable `book_id` to locate.
 * @returns Matching book instance when present; otherwise `null`.
 */
function findBook(bookId: string): Book | null {
    return books.find((book) => book.book_id === bookId) ?? null;
}

/**
 * Renders the books area using current controller state and view filters.
 */
function render(): void {
    renderBooksController({
        books,
        dialog,
        findBook,
        onBooksChanged,
        onEstimatedFinishNavigate,
        refs: REFS,
        rerender: render,
        scheduleRows,
        setBooks,
        viewState: VIEW_STATE,
    });
}

/**
 * Reads a book by id and returns a defensive copy for callers.
 * @param bookId - Stable `book_id` to locate.
 * @returns Cloned book when found; otherwise `null`.
 */
export function getBookById(bookId: string): Book | null {
    const BOOK = findBook(bookId);
    if (!BOOK) {
        return null;
    }
    return { ...BOOK };
}

/**
 * Applies progress field updates to a single book and refreshes the UI.
 * @param bookId - Stable `book_id` to update.
 * @param updates - Partial progress values to merge into the current book.
 * @param options - Behavioral flags such as change notification control.
 * @returns Updated cloned book when found; otherwise `null`.
 */
export function updateBookProgress(
    bookId: string,
    updates: BookProgressUpdates = {},
    options: UpdateBookProgressOptions = {},
): Book | null {
    const IDX = books.findIndex((book) => book.book_id === bookId);
    if (IDX < 0) {
        return null;
    }

    const NEXT = withUpdatedProgress(books[IDX], updates);
    books[IDX] = normalizeBook(NEXT);
    onBooksCommitted(books);
    render();

    if (options.notifyBooksChanged !== false) {
        onBooksChanged();
    }
    return { ...books[IDX] };
}

/**
 * Persists an edited book, including optional cover hydration, then rerenders.
 * @param payload - Book save payload including optional shelf-day propagation flag.
 */
async function saveBook(payload: BookSubmitPayload): Promise<void> {
    const HYDRATED = await hydrateBookCover(payload.book);
    let nextBooks = upsertBookById(books, HYDRATED);
    if (payload.applyScheduledDaysToShelf) {
        nextBooks = applyScheduledDaysToShelfBooks(nextBooks, HYDRATED);
    }
    books = nextBooks;
    onBooksCommitted(books);
    render();
    onBooksChanged();
}

/**
 * Replaces controller books from persisted payload data.
 * @param nextBooks - Raw books to normalize and render.
 */
export function fillBooks(nextBooks: Book[] = []): void {
    books = nextBooks.map(normalizeBook);
    onBooksCommitted(books);
    render();
}

/**
 * Stores planner schedule rows used for finish-date and grouping metadata.
 * @param rows - Schedule rows aligned to the current reading plan.
 */
export function setBookScheduleRows(rows: PlannerScheduleRow[] = []): void {
    scheduleRows = [...rows];
    render();
}

/**
 * Collects books that should be sent to planner scheduling logic.
 * @returns Normalized planner payload books that are title-complete and schedulable.
 */
export function collectBooks(): Book[] {
    const SCHEDULABLE_BOOKS = books.map(toPayloadBook).filter((book) => {
        const NORMALIZED_TITLE = book.title.trim();
        return (
            NORMALIZED_TITLE.length > 0 &&
            hasSchedulableLength(book) &&
            schedulableBook(book)
        );
    });
    return clearMissingBlockedBy(SCHEDULABLE_BOOKS);
}

/**
 * Collects every titled book for persistence regardless of schedulable state.
 * @returns Normalized payload books with non-empty titles.
 */
export function collectAllBooks(): Book[] {
    return books.map(toPayloadBook).filter((book) => {
        return book.title.trim().length > 0;
    });
}

/**
 * Binds books toolbar, dialog, and grid events for interactive editing.
 * @param onChanged - Callback fired after persisted book list mutations.
 * @param options - Optional UI behavior hooks.
 */
export function bindBooksUI(
    onChanged: () => void = DEFAULT_ON_BOOKS_CHANGED,
    options: BindBooksUIOptions = {},
): void {
    onBooksChanged = onChanged;
    const ESTIMATED_FINISH_NAVIGATE_HANDLER = options.onEstimatedFinishNavigate;
    if (typeof ESTIMATED_FINISH_NAVIGATE_HANDLER === "function") {
        onEstimatedFinishNavigate = (dateKey: string): void => {
            ESTIMATED_FINISH_NAVIGATE_HANDLER(dateKey);
        };
    } else {
        onEstimatedFinishNavigate = DEFAULT_ON_ESTIMATED_FINISH_NAVIGATE;
    }
    REFS.toolbar = document.querySelector(".books-toolbar");
    if (!(REFS.toolbar instanceof HTMLElement)) {
        return;
    }

    REFS.grid = el("booksGrid");
    REFS.empty = el("booksEmpty");
    REFS.addBtn = el<HTMLButtonElement>("addBookBtn");

    const TOOLBAR_CONTROLS = ensureBooksToolbarControls(REFS.toolbar);
    REFS.titleFilterInput = TOOLBAR_CONTROLS.titleFilterInput;
    REFS.shelfFilterSelect = TOOLBAR_CONTROLS.shelfFilterSelect;
    REFS.statusFilterSelect = TOOLBAR_CONTROLS.statusFilterSelect;
    REFS.sortBySelect = TOOLBAR_CONTROLS.sortBySelect;
    REFS.groupBySelect = TOOLBAR_CONTROLS.groupBySelect;
    REFS.sortDirectionBtn = TOOLBAR_CONTROLS.sortDirectionBtn;

    bindToolbarEvents({ refs: REFS, rerender: render, viewState: VIEW_STATE });

    dialog = createBookDialog(saveBook, { getBooks: () => books });
    REFS.addBtn.onclick = () => {
        if (!dialog) {
            return;
        }
        dialog.open(null, {
            defaultShelf: defaultShelfForAddDialog(VIEW_STATE.shelfFilter),
        });
    };

    render();
}

/**
 * Registers callback invoked after in-memory book collection mutations.
 * @param hook - Observer callback for committed in-memory book list.
 */
export function setBookCommitHook(hook?: (books: Book[]) => void): void {
    if (typeof hook === "function") {
        onBooksCommitted = hook;
        return;
    }
    onBooksCommitted = DEFAULT_ON_BOOKS_COMMITTED;
}
