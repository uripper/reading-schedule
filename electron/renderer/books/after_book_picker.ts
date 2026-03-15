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

function refreshPickerOptions(state: PickerState, getBooks: GetBooks): void {
    const STATE = state;
    STATE.options = availablePickerOptions(STATE.currentBookId, getBooks);
}

interface CreateRefreshFilteredArgs {
    clearSelection: () => void;
    refs: BookFormRefs;
    render: () => void;
    state: PickerState;
}

interface SelectBookArgs {
    clearResults: () => void;
    refs: BookFormRefs;
    render: () => void;
    state: PickerState;
}

interface OpenForBookArgs {
    clearResults: () => void;
    refreshOptions: () => void;
    refs: BookFormRefs;
    render: () => void;
    state: PickerState;
}

interface BindPickerEventsArgs {
    clearResults: () => void;
    refreshFiltered: (clearChangedSelection: boolean) => void;
    refs: BookFormRefs;
    render: () => void;
    selectBook: (book: Book | null | undefined) => void;
    state: PickerState;
}

interface PickerActions {
    clearResults: () => void;
    openForBook: (book?: Book | null) => void;
    refreshFiltered: (clearChangedSelection: boolean) => void;
    render: () => void;
    selectBook: (book: Book | null | undefined) => void;
}

interface PickerActionDeps {
    clearResults: () => void;
    clearSelection: () => void;
    getBooks: GetBooks;
    refs: BookFormRefs;
    render: () => void;
    state: PickerState;
}

function pickerActionsResult(actions: PickerActions): PickerActions {
    return actions;
}

function pickerActionDeps(args: PickerActionDeps): PickerActionDeps {
    return args;
}

function nextFilteredBooks(options: Book[], query: string): Book[] {
    return options.filter((book) => matchesQuery(book, query));
}

function nextActiveIndex(filtered: Book[]): number {
    if (filtered.length === 0) {
        return NO_ACTIVE_INDEX;
    }
    return FIRST_RESULT_INDEX;
}

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

function createPickerState(): PickerState {
    return {
        activeIndex: NO_ACTIVE_INDEX,
        currentBookId: "",
        filtered: [],
        options: [],
        selectedBookId: "",
    };
}

function createPickerRender(
    refs: BookFormRefs,
    state: PickerState,
): () => void {
    return (): void => {
        renderAfterBookResults(refs, state);
    };
}

function createClearResults(state: PickerState): () => void {
    return (): void => {
        const STATE = state;
        STATE.filtered = [];
        STATE.activeIndex = NO_ACTIVE_INDEX;
    };
}

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

function createPickerSelectBookAction(
    args: Pick<PickerActionDeps, "clearResults" | "refs" | "render" | "state">,
): (book: Book | null | undefined) => void {
    return createSelectBook(args);
}

function createPickerRefreshFilteredAction(
    args: Pick<
        PickerActionDeps,
        "clearSelection" | "refs" | "render" | "state"
    >,
): (clearChangedSelection: boolean) => void {
    return createRefreshFiltered(args);
}

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

function pickerActionsFor(args: PickerActionDeps): PickerActions {
    return pickerActionsResult({
        clearResults: args.clearResults,
        openForBook: createPickerOpenForBookAction(args),
        refreshFiltered: createPickerRefreshFilteredAction(args),
        render: args.render,
        selectBook: createPickerSelectBookAction(args),
    });
}

function createPickerActions(
    refs: BookFormRefs,
    state: PickerState,
    getBooks: GetBooks,
): PickerActions {
    return pickerActionsFor(createPickerActionDeps(refs, state, getBooks));
}

export function createAfterBookPicker(
    refs: BookFormRefs,
    getBooks: GetBooks,
): AfterBookPicker {
    const STATE = createPickerState();
    const ACTIONS = createPickerActions(refs, STATE, getBooks);
    bindPickerEvents({ ...ACTIONS, refs, state: STATE });
    return { openForBook: ACTIONS.openForBook };
}
