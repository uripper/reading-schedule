/**
 * Builds and binds the "blocked by" picker that lets a book depend on another
 * book in the current shelf.
 */
import type {
    AfterBookPicker,
    Book,
    BookFormRefs,
    GetBooks,
    PickerState,
} from "../../types/types.ts";
import { bindAfterBookPickerEvents } from "./after_book_picker_bindings.ts";
import {
    compareBooks,
    labelsMatch,
    matchesQuery,
    optionLabel,
} from "./after_book_picker_helpers.ts";
import { initializePickerForBook } from "./after_book_picker_open.ts";
import {
    FIRST_RESULT_INDEX,
    NO_ACTIVE_INDEX,
    renderAfterBookResults,
    selectedBook,
} from "./after_book_picker_render.ts";

/** Returns sorted picker candidates other than the book currently being edited. */
function availablePickerOptions(
    currentBookId: string,
    getBooks: GetBooks,
): Book[] {
    const AVAILABLE_BOOKS = getBooks().filter((book) => {
        const BOOK_ID = String(book.book_id || "");
        if (BOOK_ID === "") {
            return false;
        }
        return BOOK_ID !== currentBookId;
    });
    return AVAILABLE_BOOKS.toSorted(compareBooks);
}

/** Refreshes the cached option list from the latest bookshelf snapshot. */
function refreshPickerOptions(state: PickerState, getBooks: GetBooks): void {
    const STATE = state;
    STATE.options = availablePickerOptions(STATE.currentBookId, getBooks);
}

/** Bundles the dependencies needed to recompute filtered picker results. */
interface CreateRefreshFilteredArgs {
    clearSelection: () => void;
    refs: BookFormRefs;
    render: () => void;
    state: PickerState;
}

/** Bundles the dependencies needed to apply a selected blocking book. */
interface SelectBookArgs {
    clearResults: () => void;
    refs: BookFormRefs;
    render: () => void;
    state: PickerState;
}

/** Bundles the dependencies needed to reopen the picker for a specific book. */
interface OpenForBookArgs {
    clearResults: () => void;
    refreshOptions: () => void;
    refs: BookFormRefs;
    render: () => void;
    state: PickerState;
}

/** Bundles the callbacks that the DOM event binding layer needs. */
interface BindPickerEventsArgs {
    clearResults: () => void;
    refreshFiltered: (clearChangedSelection: boolean) => void;
    refs: BookFormRefs;
    render: () => void;
    selectBook: (book: Book | null | undefined) => void;
    state: PickerState;
}

/** Groups the picker operations exposed to the rest of the form flow. */
interface PickerActions {
    clearResults: () => void;
    openForBook: (book?: Book | null) => void;
    refreshFiltered: (clearChangedSelection: boolean) => void;
    render: () => void;
    selectBook: (book: Book | null | undefined) => void;
}

/** Carries the shared picker state and helper callbacks used to build actions. */
interface PickerActionDeps {
    clearResults: () => void;
    clearSelection: () => void;
    getBooks: GetBooks;
    refs: BookFormRefs;
    render: () => void;
    state: PickerState;
}

/** Preserves the picker action shape while letting inference stay local. */
function pickerActionsResult(actions: PickerActions): PickerActions {
    return actions;
}

/** Preserves the picker dependency shape while letting inference stay local. */
function pickerActionDeps(args: PickerActionDeps): PickerActionDeps {
    return args;
}

/** Filters the available options with the current query string. */
function nextFilteredBooks(options: Book[], query: string): Book[] {
    return options.filter((book) => matchesQuery(book, query));
}

/** Chooses the next highlighted result index for the current filtered list. */
function nextActiveIndex(filtered: Book[]): number {
    if (filtered.length === 0) {
        return NO_ACTIVE_INDEX;
    }
    return FIRST_RESULT_INDEX;
}

/** Decides whether a query change invalidates the current selection. */
function shouldClearChangedSelection(
    args: CreateRefreshFilteredArgs,
    clearChangedSelection: boolean,
    query: string,
): boolean {
    if (!clearChangedSelection) {
        return false;
    }
    const CURRENT = selectedBook(args.state);
    if (!(query && CURRENT && labelsMatch(query, optionLabel(CURRENT)))) {
        return true;
    }
    return false;
}

/** Creates the query-refresh handler used by typing and picker navigation. */
function createRefreshFiltered(
    args: CreateRefreshFilteredArgs,
): (clearChangedSelection: boolean) => void {
    return (clearChangedSelection: boolean): void => {
        const QUERY = args.refs.afterBookInput.value.trim();
        if (shouldClearChangedSelection(args, clearChangedSelection, QUERY)) {
            args.clearSelection();
        }
        const STATE = args.state;
        STATE.filtered = nextFilteredBooks(STATE.options, QUERY);
        STATE.activeIndex = nextActiveIndex(STATE.filtered);
        args.render();
    };
}

/** Creates the mutable picker state for a book form session. */
function createPickerState(): PickerState {
    return {
        activeIndex: NO_ACTIVE_INDEX,
        currentBookId: "",
        filtered: [],
        options: [],
        selectedBookId: "",
    };
}

/** Wraps the result renderer so callers can trigger a consistent repaint. */
function createPickerRender(
    refs: BookFormRefs,
    state: PickerState,
): () => void {
    return (): void => {
        renderAfterBookResults(refs, state);
    };
}

/** Creates a helper that clears the visible search results and highlight. */
function createClearResults(state: PickerState): () => void {
    return (): void => {
        const STATE = state;
        STATE.filtered = [];
        STATE.activeIndex = NO_ACTIVE_INDEX;
    };
}

/** Creates a helper that clears the selected blocking-book value. */
function createClearSelection(
    refs: BookFormRefs,
    state: PickerState,
): () => void {
    return (): void => {
        const STATE = state;
        const REFS = refs;
        STATE.selectedBookId = "";
        REFS.blockedByInput.value = "";
    };
}

/** Creates the action that applies a chosen blocking-book option. */
function createSelectBook(
    args: SelectBookArgs,
): (book: Book | null | undefined) => void {
    return (book: Book | null | undefined): void => {
        if (!book) {
            return;
        }
        const STATE = args.state;
        const REFS = args.refs;
        STATE.selectedBookId = String(book.book_id || "");
        REFS.blockedByInput.value = STATE.selectedBookId;
        REFS.afterBookInput.value = optionLabel(book);
        args.clearResults();
        args.render();
    };
}

/** Creates the action that reinitializes picker state for a given book. */
function createOpenForBook(
    args: OpenForBookArgs,
): (book?: Book | null) => void {
    return (book: Book | null = null): void => {
        const STATE = args.state;
        STATE.currentBookId = String(book?.book_id ?? "");
        args.refreshOptions();
        initializePickerForBook(args.refs, STATE, book);
        args.clearResults();
        args.render();
    };
}

/** Wires picker callbacks into the DOM event binding layer. */
function bindPickerEvents(args: BindPickerEventsArgs): void {
    bindAfterBookPickerEvents({
        clearResults: args.clearResults,
        refreshFiltered: args.refreshFiltered,
        refs: args.refs,
        render: args.render,
        selectBook: args.selectBook,
        state: args.state,
    });
}

/** Builds the select-book action from the shared picker dependencies. */
function createPickerSelectBookAction(
    args: Pick<PickerActionDeps, "clearResults" | "refs" | "render" | "state">,
): (book: Book | null | undefined) => void {
    return createSelectBook(args);
}

/** Builds the filter-refresh action from the shared picker dependencies. */
function createPickerRefreshFilteredAction(
    args: Pick<
        PickerActionDeps,
        "clearSelection" | "refs" | "render" | "state"
    >,
): (clearChangedSelection: boolean) => void {
    return createRefreshFiltered(args);
}

/** Builds the open-for-book action and refreshes options on each open. */
function createPickerOpenForBookAction(
    args: Pick<
        PickerActionDeps,
        "clearResults" | "getBooks" | "refs" | "render" | "state"
    >,
): (book?: Book | null) => void {
    const REFRESH_OPTIONS = (): void =>
        refreshPickerOptions(args.state, args.getBooks);
    return createOpenForBook({ ...args, refreshOptions: REFRESH_OPTIONS });
}

/** Collects the shared callbacks needed to assemble picker actions. */
function createPickerActionDeps(
    refs: BookFormRefs,
    state: PickerState,
    getBooks: GetBooks,
): PickerActionDeps {
    const RENDER = createPickerRender(refs, state);
    return pickerActionDeps({
        clearResults: createClearResults(state),
        clearSelection: createClearSelection(refs, state),
        getBooks,
        refs,
        render: RENDER,
        state,
    });
}

/** Assembles the full set of picker actions used by the book form. */
function pickerActionsFor(args: PickerActionDeps): PickerActions {
    return pickerActionsResult({
        clearResults: args.clearResults,
        openForBook: createPickerOpenForBookAction(args),
        refreshFiltered: createPickerRefreshFilteredAction(args),
        render: args.render,
        selectBook: createPickerSelectBookAction(args),
    });
}

/** Creates all picker actions for a single form instance. */
function createPickerActions(
    refs: BookFormRefs,
    state: PickerState,
    getBooks: GetBooks,
): PickerActions {
    return pickerActionsFor(createPickerActionDeps(refs, state, getBooks));
}

/** Creates and binds the after-book picker used by the book form dialog. */
export function createAfterBookPicker(
    refs: BookFormRefs,
    getBooks: GetBooks,
): AfterBookPicker {
    const STATE = createPickerState();
    const ACTIONS = createPickerActions(refs, STATE, getBooks);
    bindPickerEvents({ ...ACTIONS, refs, state: STATE });
    return { openForBook: ACTIONS.openForBook };
}
