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
import type {
    BindPickerEventsArgs,
    OpenForBookArgs,
    PickerActionDeps,
    PickerActions,
    SelectBookArgs,
} from "./after-book-picker-types.ts";
import { bindAfterBookPickerEvents } from "./after_book_picker_bindings.ts";
import { createRefreshFiltered } from "./after_book_picker_filter.ts";
import { compareBooks, optionLabel } from "./after_book_picker_helpers.ts";
import { initializePickerForBook } from "./after_book_picker_open.ts";
import {
    NO_ACTIVE_INDEX,
    renderAfterBookResults,
} from "./after_book_picker_render.ts";
import { excludedAfterBookIds } from "./after_book_ranking.ts";

/**
 * Returns the books the edited book may come after: never itself, and never
 * a book that already comes after it (that would make a cycle).
 */
function availablePickerOptions(
    currentBookId: string,
    getBooks: GetBooks,
): Book[] {
    const BOOKS = getBooks();
    const EXCLUDED = excludedAfterBookIds(BOOKS, currentBookId);
    return BOOKS.filter((book) => {
        const BOOK_ID = String(book.book_id || "");
        return BOOK_ID !== "" && !EXCLUDED.has(BOOK_ID);
    }).toSorted(compareBooks);
}

/** Refreshes the cached option list from the latest bookshelf snapshot. */
function refreshPickerOptions(state: PickerState, getBooks: GetBooks): void {
    const STATE = state;
    STATE.options = availablePickerOptions(STATE.currentBookId, getBooks);
}

/** Preserves the picker action shape while letting inference stay local. */
function pickerActionsResult(actions: PickerActions): PickerActions {
    return actions;
}

/** Preserves the picker dependency shape while letting inference stay local. */
function pickerActionDeps(args: PickerActionDeps): PickerActionDeps {
    return args;
}

function dispatchBlockedByChange(refs: BookFormRefs): void {
    refs.blockedByInput.dispatchEvent(new Event("input", { bubbles: true }));
    refs.blockedByInput.dispatchEvent(new Event("change", { bubbles: true }));
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
        dispatchBlockedByChange(REFS);
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
        dispatchBlockedByChange(REFS);
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
        clearSelection: args.clearSelection,
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
        clearSelection: args.clearSelection,
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
