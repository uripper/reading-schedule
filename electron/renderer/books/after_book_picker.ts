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

function refreshPickerOptions(state: PickerState, getBooks: GetBooks): void {
    const AVAILABLE_BOOKS = getBooks().filter((book) => {
        const BOOK_ID = String(book.book_id || "");
        if (BOOK_ID === "") {
            return false;
        }
        return BOOK_ID !== state.currentBookId;
    });
    state.options = AVAILABLE_BOOKS.toSorted(compareBooks);
}

interface CreateRefreshFilteredArgs {
    clearSelection: () => void;
    refs: BookFormRefs;
    render: () => void;
    state: PickerState;
}

/**
 * Create and return a function that refreshes the filtered book list, updates the active index and selection, and triggers a re-render.
 * @example
 * createRefreshFiltered(args)(true)
 * undefined
 * @param args - Object containing refs, state, clearSelection and render used to filter options and update UI.
 * @returns Function that when called optionally clears a mismatched selection, filters options by the current query, updates activeIndex, and calls render.
 **/
function createRefreshFiltered(
    args: CreateRefreshFilteredArgs,
): (clearChangedSelection: boolean) => void {
    return (clearChangedSelection: boolean): void => {
        const QUERY = args.refs.afterBookInput.value.trim();
        if (clearChangedSelection) {
            const CURRENT = selectedBook(args.state);
            if (
                !QUERY ||
                !CURRENT ||
                !labelsMatch(QUERY, optionLabel(CURRENT))
            ) {
                args.clearSelection();
            }
        }
        args.state.filtered = args.state.options.filter((book) =>
            matchesQuery(book, QUERY),
        );
        args.state.activeIndex = NO_ACTIVE_INDEX;
        if (args.state.filtered.length) {
            args.state.activeIndex = FIRST_RESULT_INDEX;
        }
        args.render();
    };
}

/**
 * Creates the "blocked by" picker controller used in the book dialog.
 * @param refs - Form references for picker input/results fields.
 * @param getBooks - Callback returning the latest book list.
 * @returns Picker API exposing `openForBook`.
 */
export function createAfterBookPicker(
    refs: BookFormRefs,
    getBooks: GetBooks,
): AfterBookPicker {
    const FORM_REFS = refs;
    const STATE: PickerState = {
        activeIndex: NO_ACTIVE_INDEX,
        currentBookId: "",
        filtered: [],
        options: [],
        selectedBookId: "",
    };
    const RENDER = (): void => {
        renderAfterBookResults(FORM_REFS, STATE);
    };
    const CLEAR_RESULTS = (): void => {
        STATE.filtered = [];
        STATE.activeIndex = NO_ACTIVE_INDEX;
    };
    const CLEAR_SELECTION = (): void => {
        STATE.selectedBookId = "";
        FORM_REFS.blockedByInput.value = "";
    };
    const SELECT_BOOK = (book: Book | null | undefined): void => {
        if (!book) {
            return;
        }
        STATE.selectedBookId = String(book.book_id || "");
        FORM_REFS.blockedByInput.value = STATE.selectedBookId;
        FORM_REFS.afterBookInput.value = optionLabel(book);
        CLEAR_RESULTS();
        RENDER();
    };
    const REFRESH_OPTIONS = (): void => {
        refreshPickerOptions(STATE, getBooks);
    };
    const REFRESH_FILTERED = createRefreshFiltered({
        clearSelection: CLEAR_SELECTION,
        refs: FORM_REFS,
        render: RENDER,
        state: STATE,
    });
    bindAfterBookPickerEvents({
        clearResults: CLEAR_RESULTS,
        refreshFiltered: REFRESH_FILTERED,
        refs: FORM_REFS,
        render: RENDER,
        selectBook: SELECT_BOOK,
        state: STATE,
    });
    const OPEN_FOR_BOOK = (book: Book | null = null): void => {
        STATE.currentBookId = String(book?.book_id ?? "");
        REFRESH_OPTIONS();
        initializePickerForBook(FORM_REFS, STATE, book);
        CLEAR_RESULTS();
        RENDER();
    };
    return { openForBook: OPEN_FOR_BOOK };
}
