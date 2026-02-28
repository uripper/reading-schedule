import {
    type AfterBookPicker,
    type Book,
    type BookFormRefs,
    type GetBooks,
    type PickerState,
} from "../../types/types.js";
import { bindAfterBookPickerEvents } from "./after_book_picker_bindings.js";
import {
    compareBooks,
    labelsMatch,
    matchesQuery,
    optionLabel,
} from "./after_book_picker_helpers.js";
import { initializePickerForBook } from "./after_book_picker_open.js";
import {
    FIRST_RESULT_INDEX,
    NO_ACTIVE_INDEX,
    renderAfterBookResults,
    selectedBook,
} from "./after_book_picker_render.js";

/**
 * Creates the "blocked by" picker controller used in the book dialog.
 * @param refs Form references for picker input/results fields.
 * @param getBooks Callback returning the latest book list.
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
        const AVAILABLE_BOOKS = getBooks().filter((book) => {
            const BOOK_ID = String(book.book_id || "");
            if (BOOK_ID === "") {
                return false;
            }
            return BOOK_ID !== STATE.currentBookId;
        });
        STATE.options = AVAILABLE_BOOKS.toSorted(compareBooks);
    };
    const REFRESH_FILTERED = (clearChangedSelection: boolean): void => {
        const QUERY = FORM_REFS.afterBookInput.value.trim();
        if (clearChangedSelection) {
            const CURRENT = selectedBook(STATE);
            if (
                !QUERY ||
                !CURRENT ||
                !labelsMatch(QUERY, optionLabel(CURRENT))
            ) {
                CLEAR_SELECTION();
            }
        }
        STATE.filtered = STATE.options.filter((book) =>
            matchesQuery(book, QUERY),
        );
        STATE.activeIndex = NO_ACTIVE_INDEX;
        if (STATE.filtered.length) {
            STATE.activeIndex = FIRST_RESULT_INDEX;
        }
        RENDER();
    };
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
